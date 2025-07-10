# Slay Drip - Go Backend Development Rules

## Project Layout

- Use the [golang-standards/project-layout](https://github.com/golang-standards/project-layout) as the base for structuring your Go projects. This layout is widely adopted in the Go community and provides a scalable, maintainable structure for both small and large codebases.

## Project Overview
This is a clothing management API built with Go and Gin framework, following clean architecture principles and domain-driven design.

## Core Architecture Principles

### Clean Architecture Layers
- **Domain Layer**: Business entities, interfaces, and domain logic
- **Application Layer**: Use cases, services, and business rules
- **Infrastructure Layer**: External concerns (DB, HTTP, logging)
- **Interface Layer**: HTTP handlers, API endpoints

### Code Organization
```
backend/
├── cmd/                    # Application entry points
├── internal/              # Private application code
│   ├── domain/           # Business entities and interfaces
│   ├── application/      # Use cases and services
│   ├── infrastructure/   # External implementations
│   └── interface/        # HTTP handlers and API
├── pkg/                  # Public packages (if any)
└── docs/                 # Generated documentation
```

## Go Best Practices

### Code Style
- Use `gofmt` and `golangci-lint` for code formatting
- Follow Go naming conventions (camelCase for variables, PascalCase for exported)
- Use meaningful variable names that explain intent
- Keep functions small and focused (ideally < 20 lines)
- Use proper error handling with `fmt.Errorf("...: %w", err)`

### Error Handling Strategy

#### Core Principles
- **Use Go 1.20+ error features**: `errors.Join`, `errors.Is`, `errors.As`
- **Stack traces**: Use `pkg/errors` for detailed stack traces
- **Boundary logging**: Only log errors at API boundaries, never deep in library code
- **Consistent wrapping**: Always wrap errors with context using `fmt.Errorf("...: %w", err)`

#### Error Handling Patterns

```go
// ✅ Good: Proper error wrapping with context
func (s *Service) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    user, err := s.repo.Create(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to create user in database: %w", err)
    }
    return user, nil
}

// ✅ Good: Using errors.Join for multiple errors
func (s *Service) ProcessBatch(ctx context.Context, items []Item) error {
    var errs []error
    for _, item := range items {
        if err := s.processItem(ctx, item); err != nil {
            errs = append(errs, fmt.Errorf("failed to process item %s: %w", item.ID, err))
        }
    }
    if len(errs) > 0 {
        return errors.Join(errs...)
    }
    return nil
}

// ✅ Good: Using errors.Is for error checking
func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
    user, err := s.repo.GetByID(ctx, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("user not found: %w", ErrUserNotFound)
        }
        return nil, fmt.Errorf("failed to get user from database: %w", err)
    }
    return user, nil
}

// ✅ Good: Using errors.As for error type checking
func (s *Service) UpdateUser(ctx context.Context, id string, req UpdateUserRequest) error {
    var validationErr *ValidationError
    if err := s.validateRequest(req); err != nil {
        if errors.As(err, &validationErr) {
            return fmt.Errorf("invalid request: %w", err)
        }
        return fmt.Errorf("failed to validate request: %w", err)
    }
    return nil
}

// ✅ Good: Boundary logging only
func (h *Handler) CreateUser(c *gin.Context) {
    user, err := h.service.CreateUser(c.Request.Context(), req)
    if err != nil {
        // Log only at the boundary
        h.logger.Error("failed to create user", 
            zap.Error(err),
            zap.String("user_id", req.ID),
        )
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
        return
    }
    c.JSON(http.StatusCreated, user)
}

// ❌ Avoid: Logging deep in library code
func (r *Repository) Create(ctx context.Context, user *User) error {
    if err := r.db.Create(user).Error; err != nil {
        // Don't log here - let the boundary handle it
        return fmt.Errorf("failed to insert user into database: %w", err)
    }
    return nil
}

// ❌ Avoid: Shallow error messages
func (s *Service) ProcessData(data []byte) error {
    if err := s.validate(data); err != nil {
        return fmt.Errorf("failed") // Too shallow
    }
    return nil
}
```

#### Domain Error Types
```go
// Define domain-specific error types
var (
    ErrUserNotFound    = errors.New("user not found")
    ErrInvalidInput    = errors.New("invalid input")
    ErrUnauthorized    = errors.New("unauthorized")
    ErrInternalError   = errors.New("internal error")
)

// Custom error types with additional context
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for field %s: %s", e.Field, e.Message)
}

type DomainError struct {
    Code    string
    Message string
    Cause   error
}

func (e *DomainError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Cause)
    }
    return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *DomainError) Unwrap() error {
    return e.Cause
}
```

#### Error Response Patterns
```go
// Consistent error response structure
type ErrorResponse struct {
    Error   string `json:"error"`
    Code    string `json:"code,omitempty"`
    Details string `json:"details,omitempty"`
    TraceID string `json:"trace_id,omitempty"`
}

// Error handling middleware
func ErrorHandler(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        if len(c.Errors) > 0 {
            err := c.Errors.Last().Err
            logger.Error("request failed",
                zap.Error(err),
                zap.String("path", c.Request.URL.Path),
                zap.String("method", c.Request.Method),
            )
            
            // Don't expose internal errors to clients
            c.JSON(http.StatusInternalServerError, ErrorResponse{
                Error:   "internal server error",
                TraceID: c.GetString("trace_id"),
            })
        }
    }
}
```

#### Error Handling Checklist
- [ ] Use `fmt.Errorf("...: %w", err)` for error wrapping
- [ ] Use `errors.Join` for multiple errors
- [ ] Use `errors.Is` for error checking
- [ ] Use `errors.As` for error type checking
- [ ] Log only at API boundaries
- [ ] Define domain-specific error types
- [ ] Provide meaningful error context
- [ ] Don't expose internal errors to clients
- [ ] Use stack traces for debugging
- [ ] Handle errors gracefully with fallbacks

### Dependency Injection
- Use constructor-based DI, avoid global state
- Prefer interfaces over concrete types
- Use `wire` or manual DI for complex dependencies

### Context Usage Strategy

#### Core Principles
- **Always pass `context.Context` as first parameter** for functions that perform I/O operations
- **Use context for cancellation, timeouts, and request-scoped values**
- **Propagate context cleanly** through all layers
- **Handle graceful shutdowns** with `os.Signal`

#### Context Usage Patterns

```go
// ✅ Good: Context as first parameter for I/O operations
func (r *Repository) GetUser(ctx context.Context, id int) (*User, error) {
    var user User
    if err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
        return nil, fmt.Errorf("failed to get user from database: %w", err)
    }
    return &user, nil
}

// ✅ Good: Service layer propagates context
func (s *Service) GetUser(ctx context.Context, id int) (*User, error) {
    user, err := s.repo.GetUser(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    return user, nil
}

// ✅ Good: Handler uses request context
func (h *Handler) GetUser(c *gin.Context) {
    id := c.Param("id")
    userID, err := strconv.Atoi(id)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
        return
    }
    
    user, err := h.service.GetUser(c.Request.Context(), userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
        return
    }
    
    c.JSON(http.StatusOK, user)
}

// ✅ Good: Using context.WithTimeout for external API calls
func (s *Service) CallExternalAPI(ctx context.Context, data []byte) error {
    // Create timeout context for external API call
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    
    req, err := http.NewRequestWithContext(ctx, "POST", "https://api.example.com", bytes.NewReader(data))
    if err != nil {
        return fmt.Errorf("failed to create request: %w", err)
    }
    
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return fmt.Errorf("failed to call external API: %w", err)
    }
    defer resp.Body.Close()
    
    return nil
}

// ✅ Good: Using context.WithCancel for long-running operations
func (s *Service) ProcessBatch(ctx context.Context, items []Item) error {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()
    
    for _, item := range items {
        select {
        case <-ctx.Done():
            return fmt.Errorf("processing cancelled: %w", ctx.Err())
        default:
            if err := s.processItem(ctx, item); err != nil {
                cancel() // Cancel remaining operations on error
                return fmt.Errorf("failed to process item %s: %w", item.ID, err)
            }
        }
    }
    return nil
}

// ✅ Good: Graceful shutdown with context
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()
    
    // Handle shutdown signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    
    go func() {
        <-sigChan
        cancel() // Trigger graceful shutdown
    }()
    
    // Start server with context
    server := &http.Server{
        Addr:    ":8080",
        Handler: setupRouter(),
    }
    
    go func() {
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("server error: %v", err)
        }
    }()
    
    // Wait for shutdown signal
    <-ctx.Done()
    
    // Graceful shutdown
    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer shutdownCancel()
    
    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Printf("server shutdown error: %v", err)
    }
}

// ❌ Avoid: Missing context parameter
func (r *Repository) GetUser(id int) (*User, error) {
    // Missing context - can't be cancelled or timed out
    var user User
    if err := r.db.Where("id = ?", id).First(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

// ❌ Avoid: Not propagating context
func (s *Service) GetUser(ctx context.Context, id int) (*User, error) {
    // Context not passed to repository
    user, err := s.repo.GetUser(id) // Missing ctx parameter
    if err != nil {
        return nil, err
    }
    return user, nil
}

// ❌ Avoid: Not using request context in handlers
func (h *Handler) GetUser(c *gin.Context) {
    id := c.Param("id")
    userID, _ := strconv.Atoi(id)
    
    // Using background context instead of request context
    user, err := h.service.GetUser(context.Background(), userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
        return
    }
    
    c.JSON(http.StatusOK, user)
}
```

#### Context Best Practices

```go
// ✅ Good: Context middleware for request tracing
func TraceMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Create trace ID for request
        traceID := uuid.New().String()
        ctx := context.WithValue(c.Request.Context(), "trace_id", traceID)
        c.Request = c.Request.WithContext(ctx)
        
        c.Header("X-Trace-ID", traceID)
        c.Next()
    }
}

// ✅ Good: Context with values for request-scoped data
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
            c.Abort()
            return
        }
        
        // Add user info to context
        user, err := validateToken(token)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            c.Abort()
            return
        }
        
        ctx := context.WithValue(c.Request.Context(), "user", user)
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}

// ✅ Good: Using context values safely
func (s *Service) GetUserProfile(ctx context.Context, userID int) (*Profile, error) {
    // Get user from context (set by auth middleware)
    user, ok := ctx.Value("user").(*User)
    if !ok {
        return nil, fmt.Errorf("user not found in context")
    }
    
    // Use trace ID for logging
    if traceID, ok := ctx.Value("trace_id").(string); ok {
        s.logger.Info("getting user profile",
            zap.String("trace_id", traceID),
            zap.Int("user_id", userID),
        )
    }
    
    return s.repo.GetProfile(ctx, userID)
}
```

#### Context Checklist
- [ ] Pass `context.Context` as first parameter for I/O operations
- [ ] Use `context.WithTimeout()` for external API calls
- [ ] Use `context.WithCancel()` for long-running operations
- [ ] Propagate context through all layers (Handler → Service → Repository)
- [ ] Use request context in handlers (`c.Request.Context()`)
- [ ] Handle graceful shutdowns with `os.Signal`
- [ ] Use context for request-scoped values (user, trace ID, etc.)
- [ ] Implement proper timeout handling
- [ ] Use context cancellation for cleanup
- [ ] Avoid using `context.Background()` in request handlers

## API Design Principles

### RESTful Design
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate status codes
- Use consistent URL patterns
- Version APIs with `/api/v1/` prefix

### HTTP Handler Architecture

#### Core Principles
- **Separate concerns**: Handlers should only handle HTTP concerns
- **Extract business logic** into service layer
- **Use DTOs** for request/response handling
- **Create response helpers** for consistent responses
- **Keep handlers thin** and focused

#### Clean Handler Patterns

```go
// ✅ Good: Thin handler with proper separation
type Handler struct {
    service *Service
    logger  *zap.Logger
}

func (h *Handler) CreateItem(c *gin.Context) {
    // 1. Decode request
    var req CreateItemRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        h.WriteError(c, http.StatusBadRequest, "invalid request", err)
        return
    }
    
    // 2. Call service (business logic)
    item, err := h.service.CreateItem(c.Request.Context(), req)
    if err != nil {
        h.WriteError(c, http.StatusInternalServerError, "failed to create item", err)
        return
    }
    
    // 3. Write response
    h.WriteJSON(c, http.StatusCreated, item)
}

// ✅ Good: Response helpers for consistency
func (h *Handler) WriteJSON(c *gin.Context, status int, data interface{}) {
    c.JSON(status, data)
}

func (h *Handler) WriteError(c *gin.Context, status int, message string, err error) {
    h.logger.Error("request failed",
        zap.Error(err),
        zap.String("path", c.Request.URL.Path),
        zap.String("method", c.Request.Method),
    )
    
    c.JSON(status, ErrorResponse{
        Error:   message,
        TraceID: c.GetString("trace_id"),
    })
}

// ✅ Good: DTOs for request/response handling
type CreateItemRequest struct {
    Name     string `json:"name" binding:"required"`
    Category string `json:"category" binding:"required"`
    ImageURL string `json:"imageUrl" binding:"required,url"`
}

type CreateItemResponse struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Category string `json:"category"`
    ImageURL string `json:"imageUrl"`
    Created  string `json:"created"`
}

// ✅ Good: Service layer handles business logic
type Service struct {
    repo   Repository
    logger *zap.Logger
}

func (s *Service) CreateItem(ctx context.Context, req CreateItemRequest) (*CreateItemResponse, error) {
    // Business logic validation
    if err := s.validateItem(req); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }
    
    // Create domain entity
    item := &Item{
        ID:       uuid.New().String(),
        Name:     req.Name,
        Category: req.Category,
        ImageURL: req.ImageURL,
        Created:  time.Now(),
    }
    
    // Persist to repository
    if err := s.repo.Create(ctx, item); err != nil {
        return nil, fmt.Errorf("failed to create item in repository: %w", err)
    }
    
    // Return response DTO
    return &CreateItemResponse{
        ID:       item.ID,
        Name:     item.Name,
        Category: item.Category,
        ImageURL: item.ImageURL,
        Created:  item.Created.Format(time.RFC3339),
    }, nil
}

// ✅ Good: Repository handles data access
type Repository interface {
    Create(ctx context.Context, item *Item) error
    GetByID(ctx context.Context, id string) (*Item, error)
    List(ctx context.Context) ([]*Item, error)
}

type repository struct {
    db *gorm.DB
}

func (r *repository) Create(ctx context.Context, item *Item) error {
    return r.db.WithContext(ctx).Create(item).Error
}
```

#### API Package Structure

```go
// api/handlers.go - HTTP handlers
package api

type Handler struct {
    service *Service
    logger  *zap.Logger
}

// api/dto.go - Data Transfer Objects
package api

type CreateItemRequest struct {
    Name     string `json:"name" binding:"required"`
    Category string `json:"category" binding:"required"`
    ImageURL string `json:"imageUrl" binding:"required,url"`
}

type CreateItemResponse struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Category string `json:"category"`
    ImageURL string `json:"imageUrl"`
    Created  string `json:"created"`
}

// api/response.go - Response helpers
package api

func (h *Handler) WriteJSON(c *gin.Context, status int, data interface{}) {
    c.JSON(status, data)
}

func (h *Handler) WriteError(c *gin.Context, status int, message string, err error) {
    h.logger.Error("request failed",
        zap.Error(err),
        zap.String("path", c.Request.URL.Path),
        zap.String("method", c.Request.Method),
    )
    
    c.JSON(status, ErrorResponse{
        Error:   message,
        TraceID: c.GetString("trace_id"),
    })
}

// internal/service/service.go - Business logic
package service

type Service struct {
    repo   Repository
    logger *zap.Logger
}

// internal/repository/repository.go - Data access
package repository

type Repository interface {
    Create(ctx context.Context, item *Item) error
    GetByID(ctx context.Context, id string) (*Item, error)
    List(ctx context.Context) ([]*Item, error)
}
```

#### Fat Controller Anti-Patterns

```go
// ❌ Avoid: Fat controller doing everything
func (h *Handler) CreateItem(c *gin.Context) {
    // Decoding
    var req CreateItemRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Business logic mixed with HTTP concerns
    if req.Name == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
        return
    }
    
    // Database operations in handler
    item := &Item{
        ID:       uuid.New().String(),
        Name:     req.Name,
        Category: req.Category,
        ImageURL: req.ImageURL,
    }
    
    if err := h.db.Create(item).Error; err != nil {
        h.logger.Error("database error", zap.Error(err))
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
        return
    }
    
    // Response formatting in handler
    response := gin.H{
        "id":       item.ID,
        "name":     item.Name,
        "category": item.Category,
        "imageUrl": item.ImageURL,
        "created":  item.Created.Format(time.RFC3339),
    }
    
    c.JSON(http.StatusCreated, response)
}

// ❌ Avoid: Manual JSON handling
func (h *Handler) GetItems(c *gin.Context) {
    var items []Item
    if err := h.db.Find(&items).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
        return
    }
    
    // Manual JSON construction
    response := make([]gin.H, len(items))
    for i, item := range items {
        response[i] = gin.H{
            "id":       item.ID,
            "name":     item.Name,
            "category": item.Category,
            "imageUrl": item.ImageURL,
        }
    }
    
    c.JSON(http.StatusOK, response)
}
```

#### Handler Organization Checklist
- [ ] Extract request/response DTOs to separate package
- [ ] Move business logic to service layer
- [ ] Create response helper functions
- [ ] Keep handlers focused on HTTP concerns only
- [ ] Use consistent error handling patterns
- [ ] Implement proper logging at boundaries
- [ ] Separate data access into repository layer
- [ ] Use domain entities for business logic
- [ ] Implement proper validation in service layer
- [ ] Create reusable response structures

### Validation
- Use `go-playground/validator` for input validation
- Define validation tags on structs
- Validate at API boundaries

## Database Patterns

### Repository Pattern
```go
type ItemRepository interface {
    Create(ctx context.Context, item *Item) error
    GetByID(ctx context.Context, id string) (*Item, error)
    List(ctx context.Context) ([]*Item, error)
    Update(ctx context.Context, item *Item) error
    Delete(ctx context.Context, id string) error
}
```

### Transaction Handling
- Use database transactions for multi-step operations
- Handle rollback on errors
- Use context for cancellation

## Testing Strategy

### Unit Tests
- Use table-driven tests for comprehensive coverage
- Mock external dependencies
- Test both success and error cases
- Use `testify` for assertions and mocking

```go
func TestCreateItem(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateItemRequest
        want    *Item
        wantErr bool
    }{
        // test cases
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // test implementation
        })
    }
}
```

### Integration Tests
- Test complete workflows
- Use test database
- Clean up after tests

## Configuration Management

### Environment Variables
- Use `viper` or `envconfig` for configuration
- Load from environment variables
- Provide sensible defaults
- Validate configuration on startup

```go
type Config struct {
    Port     string `envconfig:"PORT" default:"8080"`
    DBURL    string `envconfig:"DATABASE_URL" required:"true"`
    LogLevel string `envconfig:"LOG_LEVEL" default:"info"`
}
```

## Logging and Observability

### Structured Logging
- Use `zap` or `zerolog` for structured logging
- Include correlation IDs for tracing
- Log at appropriate levels (DEBUG, INFO, WARN, ERROR)
- Avoid logging sensitive information

```go
logger.Info("user created",
    zap.String("user_id", user.ID),
    zap.String("email", user.Email),
)
```

### Metrics and Monitoring
- Use Prometheus for metrics
- Implement health checks
- Monitor key business metrics
- Set up proper alerting

## Security Best Practices

### Input Validation
- Validate all inputs at API boundaries
- Use parameterized queries for database operations
- Sanitize outputs to prevent injection attacks
- Implement proper authentication and authorization

### Error Handling
- Don't expose internal errors to clients
- Log detailed errors for debugging
- Use consistent error response format

## Performance Considerations

### Concurrency and Race Condition Prevention

#### Core Principles
- **Always run `go test -race ./...`** before merging code
- **Use proper synchronization** for shared data across goroutines
- **Prefer immutable data** when possible
- **Document concurrent access patterns** clearly

#### Race Condition Prevention Patterns

```go
// ✅ Good: Using sync.RWMutex for read/write access
type UserCache struct {
    mu    sync.RWMutex
    users map[string]*User
}

func (c *UserCache) GetUser(id string) (*User, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    user, exists := c.users[id]
    return user, exists
}

func (c *UserCache) SetUser(id string, user *User) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.users[id] = user
}

// ✅ Good: Using sync.Map for concurrent map access
type ItemStore struct {
    items sync.Map
}

func (s *ItemStore) GetItem(id string) (*Item, bool) {
    value, exists := s.items.Load(id)
    if !exists {
        return nil, false
    }
    return value.(*Item), true
}

func (s *ItemStore) SetItem(id string, item *Item) {
    s.items.Store(id, item)
}

// ✅ Good: Using atomic.Value for single values
type Config struct {
    settings atomic.Value // *Settings
}

func (c *Config) GetSettings() *Settings {
    return c.settings.Load().(*Settings)
}

func (c *Config) UpdateSettings(settings *Settings) {
    c.settings.Store(settings)
}

// ✅ Good: Using channels for goroutine communication
func (s *Service) ProcessItems(ctx context.Context, items []Item) error {
    const numWorkers = 4
    jobs := make(chan Item, len(items))
    results := make(chan error, len(items))
    
    // Start workers
    for i := 0; i < numWorkers; i++ {
        go func() {
            for item := range jobs {
                if err := s.processItem(ctx, item); err != nil {
                    results <- fmt.Errorf("failed to process item %s: %w", item.ID, err)
                } else {
                    results <- nil
                }
            }
        }()
    }
    
    // Send jobs
    for _, item := range items {
        select {
        case jobs <- item:
        case <-ctx.Done():
            close(jobs)
            return ctx.Err()
        }
    }
    close(jobs)
    
    // Collect results
    for i := 0; i < len(items); i++ {
        select {
        case err := <-results:
            if err != nil {
                return err
            }
        case <-ctx.Done():
            return ctx.Err()
        }
    }
    
    return nil
}

// ✅ Good: Using errgroup for coordinated goroutines
func (s *Service) ProcessBatch(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    
    for _, item := range items {
        item := item // Capture loop variable
        g.Go(func() error {
            return s.processItem(ctx, item)
        })
    }
    
    return g.Wait()
}

// ✅ Good: Thread-safe counter with atomic operations
type Counter struct {
    value int64
}

func (c *Counter) Increment() {
    atomic.AddInt64(&c.value, 1)
}

func (c *Counter) GetValue() int64 {
    return atomic.LoadInt64(&c.value)
}

// ✅ Good: Using sync.Once for initialization
type Service struct {
    initOnce sync.Once
    client   *http.Client
}

func (s *Service) getClient() *http.Client {
    s.initOnce.Do(func() {
        s.client = &http.Client{
            Timeout: 30 * time.Second,
        }
    })
    return s.client
}

// ❌ Avoid: Unsafe concurrent map access
type BadCache struct {
    users map[string]*User // Not thread-safe
}

func (c *BadCache) GetUser(id string) (*User, bool) {
    // Race condition: concurrent read/write access
    user, exists := c.users[id]
    return user, exists
}

func (c *BadCache) SetUser(id string, user *User) {
    // Race condition: concurrent write access
    c.users[id] = user
}

// ❌ Avoid: Unsafe slice access
type BadStore struct {
    items []Item // Not thread-safe
}

func (s *BadStore) AddItem(item Item) {
    // Race condition: concurrent slice modification
    s.items = append(s.items, item)
}

// ❌ Avoid: Unsafe global variables
var globalCounter int // Not thread-safe

func incrementCounter() {
    // Race condition: concurrent access to global variable
    globalCounter++
}
```

#### Concurrency Testing

```go
// ✅ Good: Race condition testing
func TestUserCache_ConcurrentAccess(t *testing.T) {
    cache := &UserCache{
        users: make(map[string]*User),
    }
    
    const numGoroutines = 100
    const numOperations = 1000
    
    var wg sync.WaitGroup
    
    // Test concurrent reads and writes
    for i := 0; i < numGoroutines; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for j := 0; j < numOperations; j++ {
                userID := fmt.Sprintf("user_%d_%d", id, j)
                
                // Concurrent writes
                cache.SetUser(userID, &User{ID: userID})
                
                // Concurrent reads
                cache.GetUser(userID)
            }
        }(i)
    }
    
    wg.Wait()
    
    // Verify no race conditions occurred
    if len(cache.users) == 0 {
        t.Error("expected users to be added")
    }
}

// ✅ Good: Benchmark with race detection
func BenchmarkUserCache_Concurrent(b *testing.B) {
    cache := &UserCache{
        users: make(map[string]*User),
    }
    
    b.RunParallel(func(pb *testing.PB) {
        i := 0
        for pb.Next() {
            userID := fmt.Sprintf("user_%d", i)
            cache.SetUser(userID, &User{ID: userID})
            cache.GetUser(userID)
            i++
        }
    })
}
```

#### Concurrency Best Practices

```go
// ✅ Good: Immutable data structures
type User struct {
    ID       string
    Name     string
    Email    string
    Created  time.Time
    // No mutable fields - thread-safe by design
}

// ✅ Good: Copy-on-write pattern
type Config struct {
    mu       sync.RWMutex
    settings map[string]interface{}
}

func (c *Config) GetSettings() map[string]interface{} {
    c.mu.RLock()
    defer c.mu.RUnlock()
    
    // Return a copy to prevent external modification
    settings := make(map[string]interface{}, len(c.settings))
    for k, v := range c.settings {
        settings[k] = v
    }
    return settings
}

// ✅ Good: Using context for cancellation
func (s *Service) ProcessWithTimeout(ctx context.Context, data []byte) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    done := make(chan error, 1)
    go func() {
        done <- s.processData(ctx, data)
    }()
    
    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        return fmt.Errorf("processing timed out: %w", ctx.Err())
    }
}
```

#### Concurrency Checklist
- [ ] Run `go test -race ./...` before merging
- [ ] Use `sync.RWMutex` for read/write access to shared data
- [ ] Use `sync.Map` for concurrent map access
- [ ] Use `atomic.Value` for single values
- [ ] Use channels for goroutine communication
- [ ] Use `errgroup` for coordinated goroutines
- [ ] Use `sync.Once` for one-time initialization
- [ ] Use atomic operations for counters
- [ ] Prefer immutable data structures
- [ ] Document concurrent access patterns
- [ ] Test with concurrent access patterns
- [ ] Use context for cancellation and timeouts
- [ ] Avoid global variables in concurrent code
- [ ] Use copy-on-write for shared data
- [ ] Implement proper cleanup in goroutines

### Database Optimization
- Use connection pooling
- Implement proper indexing
- Use prepared statements
- Monitor query performance

## Documentation Standards

### Code Documentation
- Document exported functions and types
- Use clear, concise comments
- Include usage examples
- Keep documentation up-to-date

### API Documentation
- Use Swaggo annotations for OpenAPI generation
- Document all endpoints, parameters, and responses
- Include example requests and responses
- Maintain interactive documentation

## Development Workflow

### Code Review Checklist
- [ ] Code follows Go idioms and best practices
- [ ] Proper error handling implemented
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

### Git Practices
- Use conventional commits
- Keep commits small and focused
- Write clear commit messages
- Use feature branches

## Libraries and Dependencies

### Preferred Libraries
- **HTTP Framework**: Gin
- **Database**: GORM, Ent, or sqlx
- **Validation**: go-playground/validator
- **Logging**: zap or zerolog
- **Configuration**: viper or envconfig
- **Testing**: testify
- **Documentation**: swaggo/swag

### Dependency Management

#### Core Principles
- **Always commit `go.mod` + `go.sum`** to version control
- **Use `go mod tidy`** regularly to clean up dependencies
- **Set up automated dependency updates** (Renovate/Dependabot)
- **Pin dependency versions** for reproducible builds

#### Dependency Management Patterns

```go
// ✅ Good: Proper go.mod structure
module pmorski-slay/main

go 1.24

require (
    github.com/gin-gonic/gin v1.10.1
    github.com/swaggo/gin-swagger v1.6.0
    github.com/swaggo/files v1.0.1
    go.uber.org/zap v1.27.0
    github.com/go-playground/validator/v10 v10.20.0
)

// ✅ Good: Regular maintenance commands
// go mod tidy          # Clean up unused dependencies
// go mod download      # Download all dependencies
// go mod verify        # Verify dependencies haven't been tampered with
// go list -m all       # List all dependencies
// go list -u -m all    # List dependencies with available updates
```

#### Automated Dependency Updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "gomod"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-team"
    assignees:
      - "your-team"
    commit-message:
      prefix: "deps"
      include: "scope"
```

#### Dependency Security

```bash
# ✅ Good: Security scanning
go list -json -deps ./... | nancy sleuth
gosec ./...
govulncheck ./...

# ✅ Good: Update vulnerable dependencies
go get -u github.com/vulnerable/package@latest
go mod tidy
```

#### Dependency Management Checklist
- [ ] Always commit `go.mod` and `go.sum`
- [ ] Run `go mod tidy` before commits
- [ ] Set up Renovate/Dependabot for automated updates
- [ ] Pin dependency versions for reproducible builds
- [ ] Regularly audit dependencies for security vulnerabilities
- [ ] Use `go mod verify` to check dependency integrity
- [ ] Document dependency update procedures
- [ ] Test thoroughly after dependency updates

## Code Generation

### Swagger Documentation
- Use Swaggo annotations in handlers
- Run `swag init` to generate documentation
- Keep annotations in sync with code
- Serve Swagger UI at `/swagger/index.html`

### Code Generation Tools
- Use `wire` for dependency injection
- Use `mockgen` for generating mocks
- Use `swag` for API documentation

## Deployment and Operations

### Containerization
- Use multi-stage Docker builds
- Optimize for small image size
- Use non-root user
- Include health checks

### Environment Configuration
- Use environment variables for configuration
- Separate configs for different environments
- Use secrets management for sensitive data
- Implement proper logging and monitoring

## Quality Assurance

### Static Analysis
- Use `golangci-lint` for comprehensive linting
- Configure strict linting rules
- Run linting in CI/CD pipeline
- Address all linting issues

### Code Coverage
- Aim for >80% code coverage
- Focus on critical business logic
- Use coverage reports in CI/CD
- Maintain high test quality

## Performance Guidelines

### Benchmarking
- Use Go's built-in benchmarking tools
- Profile before optimizing
- Measure memory usage
- Monitor GC performance

### Optimization
- Profile to identify bottlenecks
- Use appropriate data structures
- Implement caching where beneficial
- Monitor resource usage

## Error Handling Patterns

### Domain Errors
```go
type DomainError struct {
    Code    string
    Message string
    Cause   error
}

func (e *DomainError) Error() string {
    return fmt.Sprintf("%s: %s", e.Code, e.Message)
}
```

### HTTP Error Responses
```go
type ErrorResponse struct {
    Error   string `json:"error"`
    Code    string `json:"code,omitempty"`
    Details string `json:"details,omitempty"`
}
```

## Migration Strategy

### Database Migrations
- Use versioned migrations
- Implement rollback capabilities
- Test migrations thoroughly
- Backup before migrations

### API Versioning
- Use URL versioning (`/api/v1/`)
- Maintain backward compatibility
- Document breaking changes
- Provide migration guides

## Monitoring and Alerting

### Health Checks
- Implement `/health` endpoint
- Check database connectivity
- Monitor external dependencies
- Return appropriate status codes

### Metrics Collection
- Use Prometheus metrics
- Monitor business KPIs
- Set up dashboards
- Configure alerting rules

## Security Checklist

- [ ] Input validation implemented
- [ ] Authentication configured
- [ ] Authorization in place
- [ ] HTTPS enabled
- [ ] Secrets properly managed
- [ ] Rate limiting implemented
- [ ] CORS configured
- [ ] Security headers set
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning

## Performance Checklist

- [ ] Database queries optimized
- [ ] Connection pooling configured
- [ ] Caching implemented where appropriate
- [ ] Memory usage monitored
- [ ] GC performance acceptable
- [ ] Response times within SLA
- [ ] Load testing completed
- [ ] Performance bottlenecks identified

## Testing Checklist

- [ ] Unit tests written
- [ ] Integration tests implemented
- [ ] API tests created
- [ ] Test coverage >80%
- [ ] Tests run in CI/CD
- [ ] Mock external dependencies
- [ ] Test error scenarios
- [ ] Performance tests included

This file should be updated as the project evolves and new patterns emerge. 