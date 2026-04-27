import { seedAlgeriaLocations } from "./algeria-seed";

const result = await seedAlgeriaLocations();

console.log(`Seeded ${result.wilayas} wilayas and ${result.communes} communes.`);
