import {projectID, dataset } from './sanityConfig.js';
export function sanityImageUrl(assetRef) {
  const parts = assetRef.split('-');
  return `https://cdn.sanity.io/images/${projectID}/${dataset}/${parts[1]}-${parts[2]}.${parts[3]}`;
}
