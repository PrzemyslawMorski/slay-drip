@S1-01
Feature: Anonymous wardrobe upload and view
  As a considered dresser
  I want to add photos of my clothes and see them in one place without creating an account
  So that I can start building my wardrobe in under a minute

  # Executable copy of the acceptance criteria in docs/specs/S1-01-anonymous-wardrobe-upload.md. Keep the two in step.

  # Age confirmation

  Scenario: An adult confirms their age and sees an empty wardrobe
    Given I open the app for the first time on this device
    Then I am asked whether I am 18 or over
    When I confirm that I am 18 or over
    Then I see my wardrobe
    And my wardrobe is empty
    And I can choose "Add photos"

  Scenario: A user under 18 is stopped and nothing is stored
    Given I open the app for the first time on this device
    When I say that I am under 18
    Then I see a message that Slay Drip is only for adults
    And I cannot reach my wardrobe
    And nothing is stored on this device

  # Consent

  Scenario: Consent to store photos is asked before the first photo is added
    Given I have confirmed that I am 18 or over
    When I choose "Add photos"
    Then I am asked whether to store photos of my clothes on this device
    And no photo is stored yet

  Scenario: Declining consent keeps the wardrobe empty
    Given I have confirmed that I am 18 or over
    And I have been asked whether to store photos of my clothes on this device
    When I decline to store photos
    Then I see my wardrobe
    And my wardrobe is empty

  Scenario: Withdrawing consent deletes every stored photo
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    When I withdraw consent and delete my photos
    And I confirm the deletion
    Then my wardrobe is empty
    And adding a photo asks for consent again

  # Upload

  Scenario Outline: A photo in a supported format is added to the wardrobe
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I add a <format> photo of a clothing item
    Then the photo appears in my wardrobe
    And my wardrobe shows 1 item

    Examples:
      | format |
      | JPEG   |
      | PNG    |
      | WebP   |

  Scenario: Several photos can be added at once
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I add 3 photos of clothing items at once
    Then my wardrobe shows 3 items

  Scenario: A file that is not a photo is rejected even when it is named as one
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I add a file named "receipt.jpg" that is not a JPEG, PNG or WebP image
    Then I see an error that the file is not a supported photo
    And my wardrobe is empty

  Scenario: A photo larger than 10 MB is rejected
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I add a JPEG photo that is larger than 10 MB
    Then I see an error that the photo is too large
    And my wardrobe is empty

  Scenario: Location and device details are removed from a stored photo
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I add a JPEG photo that contains location and device details
    Then the stored photo contains no location or device details

  Scenario: Photos are not sent over the network
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I add a photo of a clothing item
    Then no request leaves the app carrying photo data

  # Viewing

  Scenario: The wardrobe shows each item as a photo with a count
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    When I open my wardrobe
    Then I see 3 photos of clothing items in a grid
    And each photo has the name "Wardrobe item" followed by its number
    And my wardrobe shows 3 items

  Scenario: The wardrobe still shows its items after the app is reloaded
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    When I reload the app
    Then I see 3 photos of clothing items in a grid

  Scenario: The wardrobe can be used with a keyboard only
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    When I move through the wardrobe using only the Tab key
    Then I can reach "Add photos" and activate it with the Enter key

  Scenario: The wardrobe has no detectable accessibility violations
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    When I open my wardrobe
    Then it has no accessibility violations against WCAG 2.1 AA
