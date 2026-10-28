@account
Feature: Signed-in wardrobe saved to my account
  As a considered dresser
  I want my wardrobe saved to my account on the server
  So that my photos are still there the next time I sign in, while anonymous use stays on this device

  # Executable copy of the signed-in acceptance criteria. There is no spec for this slice yet. The identity provider is stubbed (tests/support/account-stub.ts).

  # Sign-in and registration

  Scenario: A new person creates an account and is signed in
    Given the account service is watched
    And I have confirmed that I am 18 or over
    When I choose "Create account"
    Then the registration page was used
    And I am signed in after a PKCE S256 code exchange
    And my wardrobe is empty

  Scenario: A person signs in to an existing account
    Given the account service is watched
    And I have confirmed that I am 18 or over
    When I choose "Sign in"
    Then I am signed in after a PKCE S256 code exchange
    And my wardrobe is empty

  Scenario: My outfits are not offered while I am signed in
    Given I am signed in with my account
    Then "My outfits" is not offered

  Scenario: Signing out returns me to the wardrobe on this device
    Given I am signed in with my account
    When I sign out
    Then I see my wardrobe
    And "My outfits" is offered

  # Consent and upload

  Scenario: Consent to store photos on my account is recorded on the server
    Given I am signed in with my account
    When I choose "Add photos"
    Then I am asked whether to store photos on my account
    When I agree to store photos on my account
    Then the server has recorded my consent to store photos

  Scenario: A photo added to my account is sent to the server with my access token
    Given I am signed in with my account
    And I have agreed to store photos on my account
    When I add one JPEG photo of a clothing item to my account
    Then the photo is sent to the server with my access token
    And my wardrobe shows 1 item

  Scenario: My photos are shown from the server after I sign in again
    Given my account already has 2 photos
    And I am signed in with my account
    Then my wardrobe shows 2 items
    And each photo is loaded from the server with my access token

  # Withdrawal

  Scenario: Withdrawing consent deletes my photos from the server
    Given I am signed in with my account
    And I have agreed to store photos on my account
    And I have added 2 photos to my account
    When I withdraw consent and delete my photos
    And I confirm the deletion
    Then the server has recorded that my consent was withdrawn
    And my wardrobe is empty

  # Anonymous use is unchanged

  Scenario: Anonymous photos are never sent to the server
    Given the account service is watched
    And I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I add a photo of a clothing item
    Then the account service has received no requests
