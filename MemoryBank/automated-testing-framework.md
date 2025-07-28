# Wardrobe App - Automated Testing with Playwright

This directory contains comprehensive automated tests for the Wardrobe App using Playwright. The test suite provides black-box automation covering functionality testing, UI assertions across various browsers and screen sizes, and visual regression testing.

## 🧪 Test Structure

### Test Files

- **`clothing-upload.spec.ts`** - Tests for clothing item upload functionality
- **`outfit-creation.spec.ts`** - Tests for outfit creation and management
- **`complete-workflow.spec.ts`** - End-to-end integration tests covering full user journeys
- **`helpers/`** - Shared utilities, page objects, and test data

### Helper Files

- **`helpers/page-objects.ts`** - Page Object Model implementations for better test organization
- **`helpers/test-data.ts`** - Reusable test data and utilities

## 🚀 Getting Started

### Prerequisites

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

#### Basic Test Execution

```bash
# Run all tests (headless)
npm test

# Run tests with browser UI visible
npm run test:headed

# Run tests with Playwright's interactive UI
npm run test:ui

# Debug tests step by step
npm run test:debug
```

#### Platform-Specific Testing

```bash
# Test mobile responsive design
npm run test:mobile

# Test tablet responsive design  
npm run test:tablet

# Test desktop browsers
npm run test:desktop

# Test across all major browsers
npm run test:cross-browser

# Test responsive breakpoints
npm run test:responsive
```

#### Targeted Testing

```bash
# Test only upload functionality
npm run test:upload

# Test only outfit creation
npm run test:outfit

# Test complete user workflows
npm run test:workflow
```

#### View Test Reports

```bash
# Open HTML test report
npm run test:report
```

## 🎯 Test Coverage

### 1. Functionality Testing

#### Upload Flow
- ✅ Image upload (single and multiple files)
- ✅ Image processing and compression
- ✅ Item details editing (name, category, color, brand, tags)
- ✅ Form validation
- ✅ Data persistence
- ✅ Error handling

#### Outfit Creation Flow
- ✅ Item selection and deselection
- ✅ Outfit composition and organization
- ✅ Outfit saving and naming
- ✅ Tag management
- ✅ State management across navigation

#### Data Management
- ✅ IndexedDB persistence
- ✅ Cross-page data consistency
- ✅ Storage quota handling
- ✅ Browser refresh persistence

### 2. Cross-Browser Testing

#### Supported Browsers
- **Chromium** (Chrome, Edge, Brave)
- **Firefox** 
- **WebKit** (Safari)

#### Browser-Specific Features
- ✅ File upload handling
- ✅ Form input behavior
- ✅ IndexedDB compatibility
- ✅ Canvas/image processing
- ✅ Responsive layout rendering

### 3. Responsive Design Testing

#### Viewport Testing
- **Mobile**: 320px - 414px width
- **Tablet**: 768px - 1024px width  
- **Desktop**: 1366px - 1920px width

#### Responsive Features
- ✅ Layout adaptation
- ✅ Touch-friendly interface scaling
- ✅ Mobile dialog sizing
- ✅ Button and form element scaling
- ✅ Grid layout responsiveness
- ✅ Navigation behavior

### 4. Visual Regression Testing

#### Screenshot Coverage
- ✅ Page layouts across viewports
- ✅ Component states (empty, loaded, error)
- ✅ Dialog and modal appearances
- ✅ Cross-browser visual consistency
- ✅ Responsive breakpoint rendering

### 5. Accessibility Testing

#### Accessibility Features
- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ Form field labeling

### 6. Performance & Reliability

#### Performance Testing
- ✅ Multiple rapid uploads
- ✅ Large dataset handling
- ✅ Network condition simulation
- ✅ Storage limitation handling

#### Reliability Testing
- ✅ Race condition handling
- ✅ Async operation management
- ✅ Error recovery
- ✅ State consistency

## 📊 Test Configuration

### Browser Projects

The test configuration includes multiple browser projects for comprehensive coverage:

```typescript
// playwright.config.ts
projects: [
  // Desktop browsers
  { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
  
  // Mobile devices
  { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  
  // Tablet devices  
  { name: 'tablet-chrome', use: { ...devices['iPad Pro'] } },
  { name: 'tablet-safari', use: { ...devices['iPad Pro'] } },
  
  // Additional breakpoints
  { name: 'small-desktop', viewport: { width: 1366, height: 768 } },
  { name: 'large-mobile', viewport: { width: 414, height: 896 } },
]
```

### Test Features

- **Parallel Execution**: Tests run concurrently for faster feedback
- **Auto-retry**: Failed tests are automatically retried
- **Screenshot/Video**: Captured on failure for debugging
- **Trace Collection**: Detailed execution traces for analysis
- **HTML Reporting**: Rich reports with test results and artifacts

## 🔧 Development Workflow

### Adding New Tests

1. **Create test file** in appropriate category directory
2. **Use Page Objects** for better maintainability
3. **Include responsive testing** for UI components
4. **Add visual screenshots** for critical flows
5. **Test error scenarios** and edge cases

### Test Best Practices

#### Page Object Pattern
```typescript
// Use page objects for reusable interactions
const uploadPage = new ClothingUploadPage(page);
await uploadPage.uploadTestImage();
await uploadPage.editItemDetails(0, testData);
```

#### Responsive Testing
```typescript
// Test multiple viewport sizes
const viewports = [
  { width: 375, height: 667, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 900, name: 'desktop' }
];

for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  await expect(page).toHaveScreenshot(`component-${viewport.name}.png`);
}
```

#### Cross-Browser Verification
```typescript
// Browser-agnostic testing
test('should work across browsers', async ({ page, browserName }) => {
  // Test functionality
  await performAction();
  
  // Verify consistent behavior
  await expect(result).toBeVisible();
  
  // Browser-specific screenshot
  await expect(page).toHaveScreenshot(`test-${browserName}.png`);
});
```

### Debugging Tests

#### Debug Mode
```bash
# Step through tests interactively
npm run test:debug
```

#### Headed Mode
```bash
# See tests running in browser
npm run test:headed
```

#### Trace Viewer
```bash
# View detailed execution traces
npx playwright show-trace trace.zip
```

#### VS Code Integration
```bash
# Install Playwright extension for VS Code
# Set breakpoints and debug directly in editor
```

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Reports

Reports are generated in multiple formats:
- **HTML Report**: Interactive web-based report
- **JUnit XML**: For CI integration
- **JSON**: For custom processing
- **Screenshots**: Visual evidence of failures
- **Videos**: Recordings of failed test runs
- **Traces**: Detailed execution logs

## 🎯 Test Scenarios Covered

### Critical User Paths

1. **New User Journey**
   - First visit to app
   - Upload first clothing items
   - Create first outfit
   - View outfit gallery

2. **Power User Workflow**
   - Bulk upload multiple items
   - Create multiple outfits
   - Manage large wardrobe
   - Edit and organize items

3. **Error Recovery**
   - Network interruption handling
   - Storage quota management
   - Invalid input handling
   - Browser refresh recovery

### Edge Cases

- Empty states (no items, no outfits)
- Maximum item limits
- Large image processing
- Rapid user interactions
- Mobile orientation changes
- Browser storage limitations

## 🛠️ Maintenance

### Updating Tests

When adding new features:
1. Add corresponding test coverage
2. Update page objects if UI changes
3. Add new test data if needed
4. Update visual baselines if UI changes
5. Test new responsive breakpoints

### Managing Screenshots

```bash
# Update visual baselines
npx playwright test --update-snapshots

# Update specific test screenshots
npx playwright test test-name --update-snapshots
```

### Performance Optimization

- Use `test.describe.configure({ mode: 'parallel' })` for independent tests
- Minimize test data setup where possible
- Use efficient selectors
- Clear state between tests
- Use `test.skip()` for temporarily disabled tests

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Visual Testing](https://playwright.dev/docs/test-screenshots)
- [Mobile Testing](https://playwright.dev/docs/emulation)

---

This comprehensive test suite ensures the Wardrobe App delivers a consistent, reliable experience across all browsers and devices while maintaining high quality through automated verification of both functionality and visual presentation.