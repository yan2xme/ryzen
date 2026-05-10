// src/sanity.ts
import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: 'usuc0cod', 
  dataset: 'production',
  useCdn: true, 
  apiVersion: '2026-05-10', 
});