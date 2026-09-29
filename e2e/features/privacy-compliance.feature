Feature: Privacy, informed consents, and legal compliance
  As an organization member and organization admin
  I want to manage informed consents, data portability, and audit logs
  So that health data processing complies with legal privacy standards

  Background:
    Given there is an organization for compliance testing

  Scenario: Member completes onboarding with explicit privacy and health processing consents
    Given a new organization member is created and signed in for compliance onboarding
    And the member is on the onboarding wizard page
    When they click get started to begin the wizard
    And they fill personal details "Lucas", "Vazquez", "+54 11 4444-5555", "1992-04-10", "male"
    And they fill biometrics details "72", "175"
    And they accept the baseline privacy and health data processing agreements
    And they submit the onboarding form
    Then the member onboarding is marked complete
    And the member has active consents recorded for terms, privacy, and health processing

  Scenario: Member encounters informed consent gate before accessing health studies form
    Given there is a member with completed onboarding for compliance
    When the member navigates to the clinical studies form without form consent
    Then they see the informed consent requirement card for "Physical Biometrics"
    When they click review and give consent
    And they accept the informed consent in the modal
    Then the clinical studies form is unlocked and ready for data entry

  Scenario: Member exports personal data archive under Habeas Data rights
    Given there is a member with completed onboarding for compliance
    When they open the profile settings page
    Then they see the data portability and export section
    When they request their personal data export
    Then their data export archive is downloaded successfully

  Scenario: Member revokes an informed consent from settings
    Given there is a member with an active form consent for "biometrics"
    When they open the profile settings page
    Then they see "Physical Biometrics Consent" listed as active
    When they click to revoke the consent for "Physical Biometrics"
    And they confirm the revocation dialog
    Then the consent status is updated to revoked
    When the member navigates to the clinical studies form without form consent
    Then they see the informed consent requirement card for "Physical Biometrics"

  Scenario: Organization admin inspects legal compliance and audit trail in dashboard
    Given there is a signed-in organization admin for the compliance dashboard
    When they navigate to the compliance and audit page
    Then they see the compliance dashboard heading
    And the audit metrics cards display total audit events and accepted consents
    And the compliance audit trail table is visible

  Scenario: Member encountering emotional distress during mood assessment sees crisis support resources
    Given there is a member with an active form consent for "mood"
    When the member navigates to the mood assessment study form
    And they indicate thoughts of self-harm in the questionnaire
    Then the confidential crisis support helpline alert is displayed
    And the helpline alert contains emergency contact numbers

  Scenario: Platform sysadmin inspects global compliance audit logs in backoffice
    Given the sysadmin is signed in to the backoffice audit logs page
    Then they see the system audit trail heading
    And the audit logs filter for accepted consents is available
