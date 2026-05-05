Feature: Service availability
  As an operator
  I want the deployed services to respond
  So that I know the environment is ready to use

  Scenario: Core API responds healthy
    When the operator checks the core API heartbeat
    Then the heartbeat confirms the service is up

  Scenario: All web portals report ready
    When the operator checks each web portal readiness page
    Then every portal reports ready
