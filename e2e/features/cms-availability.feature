Feature: CMS and health content availability
  As an operator and organization member
  I want the CMS to protect its admin panel and serve health articles
  So that health guidance is accessible while admin panels remain secure

  Scenario: CMS admin panel redirects unauthenticated users to login
    When the operator navigates to the CMS admin panel without a session
    Then they are redirected to the web frontend login page

  Scenario: Member browses health articles and news in web application
    Given there is a member with completed onboarding for compliance
    When the member opens the health news page
    Then they see the health articles and news heading

