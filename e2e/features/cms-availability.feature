Feature: CMS availability
  As an operator
  I want the CMS to protect its admin panel
  So that unauthenticated users are redirected to the web frontend login

  Scenario: CMS admin panel redirects unauthenticated users to login
    When the operator navigates to the CMS admin panel without a session
    Then they are redirected to the web frontend login page
