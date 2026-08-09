Feature: Organization management in Backoffice
  As a sysadmin
  I want to create, filter, view summary of, and delete organizations in the backoffice
  So that I can manage all tenant organizations in CheckUp360

  Background:
    Given the sysadmin is signed in to the backoffice organizations page

  Scenario: Sysadmin creates a new organization
    When they create an organization named "Hospital Central" with slug "hospital-central"
    Then the organization "Hospital Central" appears in the organization list

  Scenario: Sysadmin searches and filters organizations
    Given there are organizations named "Clínica Norte" and "Sanatorio Sur"
    When they search for "Clínica Norte" in the organization list
    Then only "Clínica Norte" is displayed in the list
    When they reset organization filters
    Then all organizations are displayed in the list

  Scenario: Sysadmin views organization summary metrics
    Given there is an organization named "Centro Médico" for detail view
    When they click on the organization "Centro Médico"
    Then they see the organization summary metrics with total members, employees, and admins

  Scenario: Sysadmin deletes an organization
    Given there is an organization named "Organización a Eliminar"
    When they delete the organization "Organización a Eliminar"
    Then the organization "Organización a Eliminar" is removed from the organization list
