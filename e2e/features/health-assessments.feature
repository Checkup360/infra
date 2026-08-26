Feature: Health assessments and risk scores
  As an organization member
  I want to complete health assessments and view my risk scores
  So that I can understand my health status

  Background:
    Given there is a member with completed onboarding for assessments

  Scenario: Member submits the clinical assessment form and sees immediate results
    When the member navigates to the clinical studies form
    And they fill in the required assessment data
    And they submit the assessment
    Then the results page shows at least one risk score card
    And the results include a "Diabetes" score
    And the results include a "Sleep Apnea" score

  Scenario: Submitted scores appear on the Status page
    Given the member has a previously submitted assessment via API
    When the member navigates to the status page
    Then the status page shows a score card for "Diabetes"
    And the status page shows a score card for "Sleep Apnea"
    And each score card displays a risk level

  Scenario: Status page shows empty state when no assessments exist
    When the member navigates to the status page
    Then the status page shows the empty assessments message

  Scenario: Assessment history dialog shows past sessions
    Given the member has two assessment sessions submitted via API
    When the member navigates to the status page
    And they open the assessment history dialog
    Then the history dialog lists at least 2 sessions
