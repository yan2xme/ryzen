import {projectID, dataset,sanityApiVersion } from './sanityConfig.js';

export function buildSanityUrl(query) {
  return `https://${projectID}.api.sanity.io/${sanityApiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
}