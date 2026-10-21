// All UI copy lives here so it can be localised later.
export const en = {
  app: {
    name: 'Slay Drip',
  },
  age: {
    heading: 'Are you 18 or over?',
    intro: 'Slay Drip is for adults aged 18 and over.',
    adult: 'Yes, I am 18 or over',
    underage: 'No, I am under 18',
  },
  underage: {
    heading: 'Slay Drip is only for adults',
    body: 'You need to be 18 or over to use this app. Nothing has been stored on this device.',
  },
  wardrobe: {
    heading: 'My wardrobe',
    empty: 'Your wardrobe is empty. Add a photo of a clothing item to start.',
    addPhotos: 'Add photos',
    itemCount: (count: number) => (count === 1 ? '1 item' : `${count} items`),
    itemAlt: (position: number) => `Wardrobe item ${position}`,
    withdraw: 'Withdraw consent and delete photos',
    withdrawConfirm: 'This deletes all photos on this device and turns off photo storage. It cannot be undone.',
    withdrawYes: 'Yes, delete all photos',
    cancel: 'Cancel',
  },
  consent: {
    heading: 'Store photos of your clothes on this device?',
    body: 'Photos stay on this device. They are never uploaded. You can delete them and withdraw consent at any time from My wardrobe.',
    yes: 'Yes, store photos',
    no: 'No, not now',
  },
  upload: {
    unsupported: 'This file is not a JPEG, PNG or WebP photo.',
    tooLarge: 'This photo is larger than 10 MB. Choose a smaller photo.',
    unreadable: 'This photo could not be read. Try another photo.',
    saveFailed: 'The photo could not be saved on this device. Try again.',
  },
} as const;
