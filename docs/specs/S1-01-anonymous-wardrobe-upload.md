# S1-01 · Anonymous wardrobe upload and view

| Field | Value |
| --- | --- |
| **Key** | S1-01 |
| **Issue type** | Story |
| **Priority** | High (repo backlog: P1) |
| **Status** | To Do |
| **Epic** | S1 · Walking skeleton |
| **Components** | client, docs |
| **Labels** | gdpr, a11y, security, frontend-only |
| **Story points** | 5 |
| **Sprint / Fix version** | Session 1 |
| **Reporter** | Przemysław Morski |
| **Assignee** | Unassigned |

## User story

Requirement served: F2.2 single-item capture, and the wardrobe view that follows it. Account creation (F1.1) is out of this ticket: no account, no sign-in, all data stays on the device.

```gherkin
Feature: Anonymous wardrobe upload and view
  As a considered dresser
  I want to add photos of my clothes and see them in one place without creating an account
  So that I can start building my wardrobe in under a minute
```

Scope for this ticket is **frontend only**. There is no backend, no deployment and no cloud resource. Everything runs in the browser and runs locally with `npm run dev`. Photos are stored in the browser's IndexedDB on the device and never uploaded.

Decisions this ticket depends on:

- [ADR-0002](../adr/0002-frontend-framework-and-build-tooling.md): React, Vite and TypeScript.
- [ADR-0003](../adr/0003-gherkin-acceptance-tests-with-playwright.md): Gherkin acceptance tests run on Playwright.
- [ADR-0004](../adr/0004-on-device-wardrobe-storage.md): photos are stored on the device in IndexedDB, with no upload.
- [ADR-0001](../adr/0001-eu-hosting-18plus-gate-gdpr-baseline.md): the 18+ gate and consent are entry points. In this slice they run in the client only, see Notes.

Executable copy of the scenarios below: [`frontend/tests/features/S1-01-anonymous-wardrobe-upload.feature`](../../frontend/tests/features/S1-01-anonymous-wardrobe-upload.feature). Keep the two in step.

## Acceptance criteria

### Age confirmation

```gherkin
Scenario: An adult confirms their age and sees an empty wardrobe
  Given I open the app for the first time on this device
  Then I am asked whether I am 18 or over
  When I confirm that I am 18 or over
  Then I see my wardrobe
  And my wardrobe is empty
  And I can choose "Add photos"
```

```gherkin
Scenario: A user under 18 is stopped and nothing is stored
  Given I open the app for the first time on this device
  When I say that I am under 18
  Then I see a message that Slay Drip is only for adults
  And I cannot reach my wardrobe
  And nothing is stored on this device
```

### Consent

```gherkin
Scenario: Consent to store photos is asked before the first photo is added
  Given I have confirmed that I am 18 or over
  When I choose "Add photos"
  Then I am asked whether to store photos of my clothes on this device
  And no photo is stored yet
```

```gherkin
Scenario: Declining consent keeps the wardrobe empty
  Given I have confirmed that I am 18 or over
  And I have been asked whether to store photos of my clothes on this device
  When I decline to store photos
  Then I see my wardrobe
  And my wardrobe is empty
```

```gherkin
Scenario: Withdrawing consent deletes every stored photo
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have added 2 photos to my wardrobe
  When I withdraw consent and delete my photos
  And I confirm the deletion
  Then my wardrobe is empty
  And adding a photo asks for consent again
```

### Upload

```gherkin
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
```

```gherkin
Scenario: Several photos can be added at once
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  When I add 3 photos of clothing items at once
  Then my wardrobe shows 3 items
```

```gherkin
Scenario: A file that is not a photo is rejected even when it is named as one
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  When I add a file named "receipt.jpg" that is not a JPEG, PNG or WebP image
  Then I see an error that the file is not a supported photo
  And my wardrobe is empty
```

```gherkin
Scenario: A photo larger than 10 MB is rejected
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  When I add a JPEG photo that is larger than 10 MB
  Then I see an error that the photo is too large
  And my wardrobe is empty
```

```gherkin
Scenario: Location and device details are removed from a stored photo
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  When I add a JPEG photo that contains location and device details
  Then the stored photo contains no location or device details
```

```gherkin
Scenario: Photos are not sent over the network
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  When I add a photo of a clothing item
  Then no request leaves the app carrying photo data
```

### Viewing

```gherkin
Scenario: The wardrobe shows each item as a photo with a count
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have added 3 photos to my wardrobe
  When I open my wardrobe
  Then I see 3 photos of clothing items in a grid
  And each photo has the name "Wardrobe item" followed by its number
  And my wardrobe shows 3 items
```

```gherkin
Scenario: The wardrobe still shows its items after the app is reloaded
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have added 3 photos to my wardrobe
  When I reload the app
  Then I see 3 photos of clothing items in a grid
```

```gherkin
Scenario: A wardrobe that cannot be read from this device shows an error and blocks changes
  Given I have confirmed that I am 18 or over
  And on-device storage cannot read my wardrobe
  When I open my outfits
  And I go back to my wardrobe
  Then I see an error that my wardrobe could not be loaded
  And I cannot add photos or create an outfit
```

```gherkin
Scenario: The wardrobe can be used with a keyboard only
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  When I move through the wardrobe using only the Tab key
  Then I can reach "Add photos" and activate it with the Enter key
```

```gherkin
Scenario: The wardrobe has no detectable accessibility violations
  Given I have confirmed that I am 18 or over
  And I have agreed to store photos of my clothes on this device
  And I have added 3 photos to my wardrobe
  When I open my wardrobe
  Then it has no accessibility violations against WCAG 2.1 AA
```

## Dependencies

| Relationship | Ticket | Status | Why |
| --- | --- | --- | --- |
| is blocked by | ADR-0002 (framework) | Proposed | Code depends on the stack. Accept the ADR before merging code. |
| is blocked by | ADR-0003 (acceptance tests) | Proposed | The scenarios above run on the chosen test tooling. |
| is blocked by | ADR-0004 (on-device storage) | Proposed | Photo persistence depends on the storage choice. |
| relates to | ADR-0001 (EU hosting, 18+, GDPR) | Accepted | Entry-point gates. This slice implements the client side only. |

## Definition of done

- [ ] Code merged to `main` through a reviewed PR, with the repo's checks passing.
- [ ] Tests added or updated alongside the changed code. Every scenario above passes under `npm run test:acceptance` in `frontend/`.
- [ ] Quality and compliance checked: photos stay on the device, EXIF removed, consent recorded and revocable, no third-party requests.
- [ ] Accessibility checked against WCAG 2.1 AA (axe scenario passes, keyboard scenario passes).
- [ ] Docs updated: this ticket status, ADR statuses (Proposed to Accepted).

## Notes

- **Gate and consent are client-side only in this slice.** [ADR-0001](../adr/0001-eu-hosting-18plus-gate-gdpr-baseline.md) requires the 18+ gate and consent to be checked on the server. This slice has no server, so the checks run in the browser and are a user-experience control, not an enforcement control. Nothing leaves the device, so no personal data reaches a service. Enforcement must move to the server before any account, sync or upload ticket ships.
- **"Anonymous" means no account.** Data is scoped to one browser on one device. Clearing site data deletes the wardrobe, and there is no recovery. The sign-up flow (F1.1, S1 walking skeleton) is a separate ticket.
- **Not in this ticket:** auto-tagging (F2.3, session 2), bulk rack capture (F2.1, session 3), background removal (F2.5), item states and wear counts (F2.4), a Content Security Policy (security guide section 11, to add with the production build).
- **Synthetic test data only.** Test photos are generated in the test run (plain colour blocks with fake metadata). No real photos enter the repo.
- Strings are externalised in `frontend/src/strings/en.ts` for later localisation.
- The app lives in `frontend/`. The repo root holds only docs and repo configuration.
