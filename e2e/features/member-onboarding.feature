Feature: Member onboarding and profile management
  As an organization member
  I want to complete my onboarding profile and update my details
  So that my health and contact records are accurate

  Background:
    Given there is an organization for onboarding
    And a new organization member without profile details is created and signed in

  Scenario: Member without profile details is redirected to onboarding
    When the member opens the web application home page
    Then they are redirected to the onboarding wizard page

  Scenario: Member completes onboarding wizard successfully
    Given the member is on the onboarding wizard page
    When they click get started to begin the wizard
    And they fill personal details "John", "Doe", "+54 11 1234-5678", "1990-05-15", "male"
    And they fill health details "75", "180", "O+", "Never", "Occasionally", "3-4 times per week"
    And they submit the onboarding form
    Then the member onboarding is marked complete
    And the member reaches the web dashboard page

  Scenario: Member updates profile settings
    Given the member has completed onboarding with "Jane", "Smith", "+54 11 9876-5432"
    When they open the profile settings page
    And they update their name to "Janice", "Smith" and phone to "+54 11 5555-4444"
    Then the profile changes are saved successfully

  Scenario: Member updates biometrics settings
    Given the member has completed onboarding with "Alex", "Torres", "+54 11 1111-2222"
    When they open the profile settings page
    And they update their biometrics to sex "male", height "175", weight "72"
    Then the biometrics changes are saved successfully

  Scenario: Settings page pre-fills saved data on reload
    Given the member has completed onboarding with "Laura", "Gomez", "+54 11 3333-4444"
    And they have saved biometrics with sex "female", height "162", weight "58"
    When they open the profile settings page
    Then the profile form shows first name "Laura", last name "Gomez"
    And the biometrics form shows height "162" and weight "58"

  Scenario: Underage applicant is prevented from completing onboarding
    Given the member is on the onboarding wizard page
    When they click get started to begin the wizard
    And they fill personal details "Tom", "Junior", "+54 11 1234-5678", "2015-05-15", "male"
    And they fill health details "45", "150", "O+", "Never", "Occasionally", "3-4 times per week"
    And they submit the onboarding form expecting failure
    Then the onboarding submission shows an underage validation error
