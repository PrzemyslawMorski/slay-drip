@S1-02
Feature: Manual outfit creation from wardrobe photos
  As a considered dresser
  I want to combine photos of my own clothes into outfits myself and save them
  So that I can record and reuse the looks I already like, without an account and without waiting for suggestions

  # Executable copy of the acceptance criteria in docs/specs/S1-02-manual-outfit-creation.md. Keep the two in step.
  # Each scenario states its own set-up (age, consent, photos), as the S1-01 feature does.

  # Starting an outfit

  Scenario: An adult with wardrobe items can start a new outfit
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    When I choose "Create outfit"
    Then I see the 3 wardrobe items to choose from
    And no item is selected
    And I cannot save the outfit yet

  Scenario: An empty wardrobe cannot start an outfit
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And my wardrobe is empty
    When I choose "Create outfit"
    Then I see a message that I need to add photos before I can create an outfit
    And no outfit is started

  Scenario: A person who has not confirmed their age cannot reach outfits
    Given I open the app for the first time on this device
    When I try to open my outfits
    Then I am asked whether I am 18 or over
    And I cannot create an outfit

  # Choosing items

  Scenario: Selecting items adds them to the outfit preview in the order I chose them
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    When I choose "Create outfit"
    And I select "Wardrobe item 3" and then "Wardrobe item 1"
    Then the outfit preview shows "Wardrobe item 3" followed by "Wardrobe item 1"
    And the outfit preview does not show "Wardrobe item 2"

  Scenario: Selecting a chosen item again removes it from the outfit
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    When I choose "Create outfit"
    And I select "Wardrobe item 1"
    And I select "Wardrobe item 1" again
    Then "Wardrobe item 1" is not in the outfit preview
    And "Wardrobe item 1" is not selected

  Scenario: An item can be selected with the keyboard
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    When I choose "Create outfit"
    And I move to "Wardrobe item 2" with the Tab key and press the Space key
    Then "Wardrobe item 2" is selected
    And its selected state is available to screen readers

  Scenario: An outfit with no items cannot be saved
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 1 photo to my wardrobe
    When I choose "Create outfit"
    And no item is selected
    And I try to choose "Save outfit"
    Then I see an error that an outfit needs at least one item
    And no outfit is saved

  # Saving

  Scenario: A named outfit is saved and listed in my outfits
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    When I choose "Create outfit"
    And I select "Wardrobe item 1" and then "Wardrobe item 2"
    And I enter the name "Weekend" and choose "Save outfit"
    Then I see "Weekend" in my outfits
    And "Weekend" lists its 2 items

  Scenario: An outfit saved without a name is numbered
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 1 photo to my wardrobe
    And I have no saved outfits
    When I choose "Create outfit"
    And I select "Wardrobe item 1"
    And I choose "Save outfit" without entering a name
    Then I see "Outfit 1" in my outfits

  Scenario: An outfit name longer than 60 characters is rejected
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 1 photo to my wardrobe
    When I choose "Create outfit"
    And I select "Wardrobe item 1"
    And I enter a name of 61 characters and choose "Save outfit"
    Then I see an error that the name must be 60 characters or fewer
    And no outfit is saved

  Scenario: Saved outfits are still there after the app is reloaded
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    And I have saved an outfit named "Weekend" with 2 wardrobe items
    When I reload the app
    And I open my outfits
    Then I see "Weekend" in my outfits
    And "Weekend" lists its 2 items

  # Editing and deleting

  Scenario: The items of a saved outfit can be changed
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    And I have saved an outfit named "Weekend" with "Wardrobe item 1" and "Wardrobe item 2"
    When I open "Weekend"
    And I deselect "Wardrobe item 2"
    And I select "Wardrobe item 3"
    And I choose "Save outfit"
    Then "Weekend" lists "Wardrobe item 1" and "Wardrobe item 3"
    And "Weekend" does not list "Wardrobe item 2"
    And I go to my wardrobe
    And my wardrobe shows 3 items

  Scenario: Deleting an outfit keeps its items in my wardrobe
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    And I have saved an outfit named "Weekend" with 2 wardrobe items
    When I delete "Weekend"
    And I confirm the deletion
    Then "Weekend" is no longer in my outfits
    And I go to my wardrobe
    And my wardrobe shows 3 items

  Scenario: Deleting a wardrobe item removes it from the outfits that use it
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 3 photos to my wardrobe
    And I have saved an outfit named "Weekend" with "Wardrobe item 1" and "Wardrobe item 2"
    When I delete "Wardrobe item 1" from my wardrobe
    And I confirm the deletion
    Then "Weekend" lists only "Wardrobe item 2"
    And my wardrobe shows 2 items

  Scenario: An outfit left with no items is deleted and I am told why
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    And I have saved an outfit named "Weekend" with only "Wardrobe item 1"
    When I delete "Wardrobe item 1" from my wardrobe
    And I confirm the deletion
    Then I see a message that "Weekend" was deleted because none of its items are left
    And "Weekend" is no longer in my outfits

  Scenario: Adding a photo does not change a saved outfit
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    And I have saved an outfit named "Weekend" with 2 wardrobe items
    When I add 1 more photo to my wardrobe
    Then "Weekend" still lists the same 2 items

  # Consent and data

  Scenario: Withdrawing consent deletes every saved outfit
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    And I have saved an outfit named "Weekend" with 2 wardrobe items
    When I withdraw consent and delete my photos
    And I confirm the deletion
    Then my wardrobe is empty
    And my outfits list is empty

  Scenario: Outfits are not sent over the network
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    When I create and save an outfit with those 2 items
    Then no request leaves the app carrying outfit or photo data

  # Accessibility

  Scenario: The outfit list has no detectable accessibility violations
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    And I have saved an outfit named "Weekend" with 2 wardrobe items
    When I open my outfits
    Then it has no accessibility violations against WCAG 2.1 AA

  Scenario: The outfit builder has no detectable accessibility violations
    Given I have confirmed that I am 18 or over
    And I have agreed to store photos of my clothes on this device
    And I have added 2 photos to my wardrobe
    And I have saved an outfit named "Weekend" with 2 wardrobe items
    When I open my outfits
    And I choose "Create outfit"
    Then it has no accessibility violations against WCAG 2.1 AA
