const mapBundleForIndex = bundle => {
  // map all date/timestamp fields from Firestore timestamps to millis and rename the firebase field
  const mappedBundle = {
    ...bundle,
    ...bundle.createTimestamp && {
      createTimestamp: bundle.createTimestamp.toMillis(),
      createTimestampFirestore: bundle.createTimestamp,  
    },
    ...bundle.updateTimestamp && {
      updateTimestamp: bundle.updateTimestamp.toMillis(),
      updateTimestampFirestore: bundle.updateTimestamp,
    },
    ...bundle.publishTimestamp && {
      publishTimestamp: bundle.publishTimestamp.toMillis(),
      publishTimestampFirestore: bundle.publishTimestamp,
    }
  }

  return mappedBundle
}

module.exports = mapBundleForIndex