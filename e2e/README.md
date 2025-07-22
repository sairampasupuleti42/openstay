# E2E Testing Suite for Openstay

This directory contains comprehensive end-to-end tests for the Openstay application using Playwright.

## 🚀 Quick Start

### Installation
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests
```bash
# Run all tests
npx playwright test

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test e2e/tests/01-homepage.spec.ts

# Run tests in debug mode
npx playwright test --debug

# Run tests for specific browser
npx playwright test --project=chromium
```

### View Test Results
```bash
# Open HTML report
npx playwright show-report

# View trace files (for failed tests)
npx playwright show-trace e2e/test-results/trace.zip
```

## 📁 Test Structure

```
e2e/
├── fixtures/           # Test data and authentication helpers
│   ├── auth.ts         # Authentication fixtures
│   └── test-data.ts    # Test data constants
├── utils/              # Helper utilities
│   └── helpers.ts      # Page object models and utilities
├── tests/              # Test specifications
│   ├── 01-homepage.spec.ts
│   ├── 02-authentication.spec.ts
│   ├── 03-navigation.spec.ts
│   ├── 04-contact-form.spec.ts
│   ├── 05-search.spec.ts
│   ├── 06-explore-page.spec.ts
│   ├── 07-social-features.spec.ts
│   ├── 08-messaging.spec.ts
│   ├── 09-incident-reporting.spec.ts
│   ├── 10-performance.spec.ts
│   ├── 11-accessibility.spec.ts
│   ├── 12-responsive.spec.ts
│   └── 13-pwa.spec.ts
├── screenshots/        # Generated screenshots
└── test-results/       # Test results and artifacts
```

## 🧪 Test Categories

### 1. **Homepage Tests** (`01-homepage.spec.ts`)
- Page loading and content verification
- Navigation links functionality
- Statistics display
- Search functionality
- Feature cards display
- Responsive design
- Accessibility checks

### 2. **Authentication Tests** (`02-authentication.spec.ts`)
- Sign in/up page display
- Form validation
- User registration flow
- Navigation between auth pages
- Password strength indicators
- Error handling

### 3. **Navigation Tests** (`03-navigation.spec.ts`)
- Main page navigation
- Header/footer navigation
- Mobile navigation
- Breadcrumb navigation
- Back/forward navigation
- 404 handling

### 4. **Contact Form Tests** (`04-contact-form.spec.ts`)
- Form display and validation
- Successful submission
- Error handling
- Loading states
- Accessibility
- XSS prevention

### 5. **Search Tests** (`05-search.spec.ts`)
- Search input functionality
- Search suggestions
- Results page display
- Filtering
- Empty results handling
- Special characters

### 6. **Explore Page Tests** (`06-explore-page.spec.ts`)
- User discovery
- Follow/unfollow actions
- Search and filtering
- View mode toggles
- Load more functionality
- Mobile responsiveness

### 7. **Social Features Tests** (`07-social-features.spec.ts`)
- Followers/following pages
- Social navigation
- Empty states
- User interactions
- Message actions

### 8. **Messaging Tests** (`08-messaging.spec.ts`)
- Messaging interface
- Conversation handling
- Message input
- Real-time features
- Mobile interface

### 9. **Incident Reporting Tests** (`09-incident-reporting.spec.ts`)
- Report form display
- Form validation
- File attachments
- Submission flow
- Error handling

### 10. **Performance Tests** (`10-performance.spec.ts`)
- Page load times
- Core Web Vitals
- Bundle size analysis
- Memory usage
- Concurrent user simulation

### 11. **Accessibility Tests** (`11-accessibility.spec.ts`)
- WCAG compliance
- Keyboard navigation
- Screen reader support
- Color contrast
- ARIA attributes

### 12. **Responsive Design Tests** (`12-responsive.spec.ts`)
- Multiple viewport testing
- Mobile navigation
- Touch interactions
- Form layouts
- Image responsiveness

### 13. **PWA Tests** (`13-pwa.spec.ts`)
- Service worker registration
- Web app manifest
- Offline functionality
- Install prompts
- App-like behavior

## 🛠️ Helper Utilities

### NavigationHelpers
```typescript
const navHelpers = new NavigationHelpers(page);
await navHelpers.goToHome();
await navHelpers.goToAbout();
```

### AuthHelpers
```typescript
const authHelpers = new AuthHelpers(page);
await authHelpers.signIn(email, password);
await authHelpers.signUp(userData);
```

### FormHelpers
```typescript
const formHelpers = new FormHelpers(page);
await formHelpers.fillContactForm(formData);
await formHelpers.submitForm();
```

### SearchHelpers
```typescript
const searchHelpers = new SearchHelpers(page);
await searchHelpers.searchFor('Paris');
await searchHelpers.applyFilters(filters);
```

## 📊 Test Configuration

### Browsers Tested
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

### Test Environment
- Base URL: `http://localhost:5174`
- Automatic dev server startup
- Parallel test execution
- Retry on failure (CI only)

### Reporting
- HTML report with screenshots
- JSON results for CI integration
- JUnit XML for test management tools
- Trace files for debugging

## 🔧 Configuration Files

### `playwright.config.ts`
Main Playwright configuration with:
- Browser projects setup
- Test directory configuration
- Reporter configuration
- Global test settings

### Test Data (`fixtures/test-data.ts`)
Centralized test data including:
- User credentials
- Form data
- Search queries
- Incident report data

### Authentication (`fixtures/auth.ts`)
Authentication helpers and fixtures for:
- Test user setup
- Authenticated page fixture
- Onboarding completion

## 🚨 Best Practices

### Test Organization
- One feature per test file
- Descriptive test names
- Proper test grouping with `describe`
- Setup and teardown in `beforeEach`/`afterEach`

### Page Object Pattern
- Reusable helper classes
- Encapsulated page interactions
- Maintainable test code
- Clear separation of concerns

### Assertions
- Explicit waits with `expect`
- Proper timeout handling
- Meaningful error messages
- Multiple assertion strategies

### Data Management
- Centralized test data
- Environment-specific configuration
- Clean test isolation
- Proper cleanup

## 🐛 Debugging

### Debug Mode
```bash
# Run in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test e2e/tests/01-homepage.spec.ts --debug
```

### Screenshots and Videos
- Automatic screenshots on failure
- Video recording for failed tests
- Full page screenshots available
- Element-specific screenshots

### Trace Viewer
```bash
# View trace for failed test
npx playwright show-trace e2e/test-results/trace.zip
```

## 📈 CI/CD Integration

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: npx playwright test
  
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### Test Reports
- HTML report for detailed analysis
- JSON results for programmatic access
- JUnit XML for test management integration
- Screenshots and videos for debugging

## 🔄 Maintenance

### Regular Updates
- Update test data as features change
- Maintain helper utilities
- Update selectors as UI changes
- Review and update assertions

### Performance Monitoring
- Track test execution times
- Monitor flaky tests
- Optimize slow tests
- Regular browser updates

### Coverage Analysis
- Ensure all critical paths are tested
- Add tests for new features
- Remove obsolete tests
- Maintain test documentation

## 📞 Support

For questions about the E2E testing suite:

1. Check test documentation
2. Review helper utilities
3. Check Playwright documentation
4. Contact the development team

---

**Happy Testing!** 🎭✨