# Multi-stage build for Lambda functions
FROM public.ecr.aws/lambda/provided:al2 as builder

# Install Go
RUN yum install -y golang

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o bootstrap \
    functions/get-items/main.go

# Runtime stage
FROM public.ecr.aws/lambda/provided:al2

# Copy the binary from builder stage
COPY --from=builder /app/bootstrap ${LAMBDA_RUNTIME_DIR}/bootstrap

# Set the CMD to your handler
CMD [ "bootstrap" ] 