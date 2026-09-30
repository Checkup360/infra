Feature: Organization score weights configuration
  As an organization admin
  I want to configure score weights and risk evaluation modules
  So that risk calculations align with my organization's health priorities

  Background:
    Given there is an organization with a signed-in organization admin for score weights

  Scenario: Organization admin views score weights configuration
    When the org admin navigates to the score weights page
    Then they see the score weights dashboard heading
    And the available score topic categories are displayed

  Scenario: Organization admin updates and saves score weights
    Given the org admin is on the score weights page
    When they apply balanced weights across score categories
    And they save the score weights configuration
    Then the score weights changes are saved successfully
