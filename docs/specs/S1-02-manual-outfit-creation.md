# S1-02 · Manual outfit creation from wardrobe photos

| Field | Value |
| --- | --- |
| **Key** | S1-02 |
| **Issue type** | Story |
| **Priority** | Medium (repo backlog: P2) |
| **Status** | To Do |
| **Epic** | S1 · Walking skeleton |
| **Components** | client, docs |
| **Labels** | gdpr, a11y, frontend-only |
| **Story points** | 3 |
| **Sprint / Fix version** | Session 1 |
| **Reporter** | Przemysław Morski |
| **Assignee** | Unassigned |

## User story

Requirement served: none yet. [Requirements](../requirements.md) F3 covers AI-generated outfits only, so this story needs a requirement before it starts. See Notes.

```gherkin
Feature: Manual outfit creation from wardrobe photos
  As a considered dresser
  I want to combine photos of my own clothes into outfits myself and save them
  So that I can record and reuse the looks I already like, without an account and without waiting for suggestions
```

Scope for this ticket is **frontend only**, as in S1-01. The person chooses wardrobe items from their own photos, arranges them as an outfit, names it and saves it. Outfits are stored in the browser's IndexedDB on the device, next to the wardrobe photos. Nothing is uploaded.

An outfit is a name plus one or more wardrobe items. No occasion, weather, tagging or AI is involved.

Decisions this ticket depends on:

- [S1-01](S1-01-anonymous-wardrobe-upload.md): the wardrobe photos, consent and anonymous, on-device storage that this ticket reuses.
- [ADR-0004](../adr/0004-on-device-wardrobe-storage.md): on-device IndexedDB storage. It needs an amendment for outfits, see Notes.
- [ADR-0002](../adr/0002-frontend-framework-and-build-tooling.md): React, Vite and TypeScript.
- [ADR-0003](../adr/0003-gherkin-acceptance-tests-with-playwright.md): Gherkin acceptance tests run on Playwright.

Executable copy of the scenarios below: not written yet. Create it with the implementation, next to the S1-01 feature file, and keep the two in step.

## Acceptance criteria

### Starting an outfit

```gherkin
Scenario: An adult with wardrobe items can start a new outfit
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have added 3 photos to my wardrobe
  When I choose "Create outfit"
  Then I see the 3 wardrobe items to choose from
  And no item is selected
  And I cannot save the outfit yet
```

```gherkin
Scenario: An empty wardrobe cannot start an outfit
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And my wardrobe is empty
  When I choose "Create outfit"
  Then I see a message that I need to add photos before I can create an outfit
  And no outfit is started
```

```gherkin
Scenario: A person who has not confirmed their age cannot reach outfits
  Given I open the app for the first time on this device
  When I try to open my outfits
  Then I am asked whether I am 18 or over
  And I cannot create an outfit
```

### Choosing items

```gherkin
Scenario: Selecting items adds them to the outfit preview in the order I chose them
  Given I am creating an outfit from my wardrobe of 3 items
  When I select "Wardrobe item 3" and then "Wardrobe item 1"
  Then the outfit preview shows "Wardrobe item 3" followed by "Wardrobe item 1"
  And the outfit preview does not show "Wardrobe item 2"
```

```gherkin
Scenario: Selecting a chosen item again removes it from the outfit
  Given I am creating an outfit
  And I have selected "Wardrobe item 1"
  When I select "Wardrobe item 1" again
  Then "Wardrobe item 1" is not in the outfit preview
  And "Wardrobe item 1" is not selected
```

```gherkin
Scenario: An item can be selected with the keyboard
  Given I am creating an outfit from my wardrobe of 3 items
  When I move to "Wardrobe item 2" with the Tab key and press the Space key
  Then "Wardrobe item 2" is selected
  And its selected state is available to screen readers
```

```gherkin
Scenario: An outfit with no items cannot be saved
  Given I am creating an outfit
  And no item is selected
  When I choose "Save outfit"
  Then I see an error that an outfit needs at least one item
  And no outfit is saved
```

### Saving

```gherkin
Scenario: A named outfit is saved and listed in my outfits
  Given I am creating an outfit with 2 wardrobe items
  When I enter the name "Weekend" and choose "Save outfit"
  Then I see "Weekend" in my outfits
  And "Weekend" lists its 2 items
```

```gherkin
Scenario: An outfit saved without a name is numbered
  Given I have no saved outfits
  And I am creating an outfit with 1 wardrobe item
  When I choose "Save outfit" without entering a name
  Then I see "Outfit 1" in my outfits
```

```gherkin
Scenario: An outfit name longer than 60 characters is rejected
  Given I am creating an outfit with 1 wardrobe item
  When I enter a name of 61 characters and choose "Save outfit"
  Then I see an error that the name must be 60 characters or fewer
  And no outfit is saved
```

```gherkin
Scenario: Saved outfits are still there after the app is reloaded
  Given I have saved an outfit named "Weekend" with 2 wardrobe items
  When I reload the app
  Then I see "Weekend" in my outfits
  And "Weekend" lists its 2 items
```

### Editing and deleting

```gherkin
Scenario: The items of a saved outfit can be changed
  Given I have saved an outfit named "Weekend" with "Wardrobe item 1" and "Wardrobe item 2"
  When I open "Weekend", deselect "Wardrobe item 2", select "Wardrobe item 3" and choose "Save outfit"
  Then "Weekend" lists "Wardrobe item 1" and "Wardrobe item 3"
  And "Weekend" does not list "Wardrobe item 2"
  And my wardrobe still shows all 3 items
```

```gherkin
Scenario: Deleting an outfit keeps its items in my wardrobe
  Given I have saved an outfit named "Weekend" with 2 items
  And my wardrobe shows 3 items
  When I delete "Weekend" and confirm the deletion
  Then "Weekend" is no longer in my outfits
  And my wardrobe still shows 3 items
```

```gherkin
Scenario: Deleting a wardrobe item removes it from the outfits that use it
  Given I have saved an outfit named "Weekend" with "Wardrobe item 1" and "Wardrobe item 2"
  When I delete "Wardrobe item 1" from my wardrobe and confirm the deletion
  Then "Weekend" lists only "Wardrobe item 2"
  And my wardrobe shows 2 items
```

```gherkin
Scenario: An outfit left with no items is deleted and I am told why
  Given I have saved an outfit named "Weekend" with only "Wardrobe item 1"
  When I delete "Wardrobe item 1" from my wardrobe and confirm the deletion
  Then "Weekend" is no longer in my outfits
  And I see a message that "Weekend" was deleted because none of its items are left
```

```gherkin
Scenario: Adding a photo does not change a saved outfit
  Given I have saved an outfit named "Weekend" with 2 wardrobe items
  When I add 1 more photo to my wardrobe
  Then "Weekend" still lists the same 2 items
```

### Consent and data

```gherkin
Scenario: Withdrawing consent deletes every saved outfit
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have saved an outfit named "Weekend" with 2 wardrobe items
  When I withdraw consent and delete my photos
  And I confirm the deletion
  Then my wardrobe is empty
  And my outfits list is empty
```

```gherkin
Scenario: Outfits are not sent over the network
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have added 2 photos to my wardrobe
  When I create and save an outfit with those 2 items
  Then no request leaves the app carrying outfit or photo data
```

### Accessibility

```gherkin
Scenario: The outfit builder and outfit list have no detectable accessibility violations
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have saved an outfit named "Weekend" with 2 wardrobe items
  When I open my outfits and then the outfit builder
  Then each screen has no accessibility violations against WCAG 2.1 AA
```

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | [S1-01](S1-01-anonymous-wardrobe-upload.md) | To Do | Outfits are built from wardrobe photos, and the consent and storage come from S1-01. |
| is blocked by | ADR-0004 (on-device storage) | Proposed | Needs an `outfits` store added to the decision. See Notes. |
| is blocked by | ADR-0002 (framework) | Proposed | Code depends on the stack. |
| is blocked by | ADR-0003 (acceptance tests) | Proposed | The scenarios above run on the chosen test tooling. |
| relates to | [Requirements F3](../requirements.md) | Open | Manual outfits are not in F3. A requirement is needed first. See Notes. |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with the repo's checks passing.
- [ ] Tests added or updated alongside the changed code. Every scenario above passes under `npm run test:acceptance` in `frontend/`.
- [ ] Quality and compliance checked: outfits stay on the device, are deleted with consent, and no third-party requests are made.
- [ ] Accessibility checked against WCAG 2.1 AA (axe scenario and keyboard scenario pass).
- [ ] Docs updated: this ticket status, ADR-0004 amended for the `outfits` store, requirement added to F3.

## Notes

- **No requirement yet.** [requirements.md](../requirements.md) has no item for manual outfit creation. CLAUDE.md says to stop and ask before implementing a change with no matching requirement. Either add an F3 item (for example "F3.7 A person can build and save an outfit from their own items") or confirm that it sits under an existing item. This ticket does not add it.
- **ADR-0004 needs an `outfits` store.** ADR-0004 lists three object stores (`items`, `consent`, `profile`). Outfits need a fourth. Amend ADR-0004 or write a new ADR before the code lands. The withdrawal action must clear `outfits` as well as `items`.
- **Outfit definition (decided here, please confirm):** a name plus one or more wardrobe items, with no maximum item count. Items keep the order in which they were selected.
- **Default name (decided here):** "Outfit" followed by a number, with the number one more than the count of saved outfits at save time. Names are capped at 60 characters.
- **Outfit data follows wardrobe consent.** Outfits are built from wardrobe photos, so they fall under the wardrobe-photo consent. They are not a separate consent type and are deleted with it.
- **Deleting an item** removes it from every outfit that uses it. An outfit that is left empty is deleted, and the person is told.
- **Not in this ticket:** occasion presets, weather, AI suggestions, auto-tagging, flat-lay rendering or collages, background removal, sharing, "wore it" tracking and wear history.
- **"Anonymous" means no account,** as in S1-01. Data is scoped to one browser on one device.
- **Synthetic test data only.** Test photos are generated in the test run, as in S1-01.
- Strings are externalised in `frontend/src/strings/en.ts` for later localisation.
