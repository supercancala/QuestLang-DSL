import { parseQuestLangMock } from './mockEngine';
import { SAMPLE_ADVENTURES } from '../data/sampleAdventures';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Running QuestLang Mock Engine Test Suite ---');

// Test 1: "The mysterious town" (9-scene adventure)
console.log('Test 1: Validating "The mysterious town" 9-scene preset...');
const townResult = parseQuestLangMock(SAMPLE_ADVENTURES[0].code);
assert(townResult.valid, 'The mysterious town should be valid');
assert(townResult.model !== null, 'Model should not be null');
assert(townResult.model?.title === 'The mysterious town', 'Title should match');
assert(townResult.model?.startScene === 'Entrance', 'Start scene should be Entrance');
const sceneKeys = Object.keys(townResult.model?.scenes || {});
assert(sceneKeys.length === 9, `Expected 9 scenes, found ${sceneKeys.length}`);
assert(sceneKeys.includes('Entrance'), 'Should contain Entrance');
assert(sceneKeys.includes('TheTown'), 'Should contain TheTown');
assert(sceneKeys.includes('Garage'), 'Should contain Garage');
assert(sceneKeys.includes('RoadHome'), 'Should contain RoadHome');
assert(sceneKeys.includes('Inn'), 'Should contain Inn');
assert(sceneKeys.includes('FoggyForest'), 'Should contain FoggyForest');
assert(sceneKeys.includes('OldRoad'), 'Should contain OldRoad');
assert(sceneKeys.includes('Clearing'), 'Should contain Clearing');
assert(sceneKeys.includes('Cabin'), 'Should contain Cabin');

// Verify exits of key scenes
assert(townResult.model?.scenes['RoadHome'].exit.type === 'conclude', 'RoadHome should conclude');
assert(townResult.model?.scenes['Cabin'].exit.type === 'conclude', 'Cabin should conclude');
assert(townResult.model?.scenes['OldRoad'].exit.type === 'jump', 'OldRoad should be jump');
assert(townResult.model?.scenes['Clearing'].exit.type === 'jump', 'Clearing should be jump');
assert(townResult.model?.scenes['Entrance'].exit.type === 'choices', 'Entrance should have choices');
console.log('✓ Test 1 passed!');

// Test 2: Blank Template
console.log('Test 2: Validating "Blank Template"...');
const blankResult = parseQuestLangMock(SAMPLE_ADVENTURES[1].code);
assert(blankResult.valid, 'Blank template should be valid');
assert(Object.keys(blankResult.model?.scenes || {}).length === 2, 'Blank template should have 2 scenes');
console.log('✓ Test 2 passed!');

// Test 3: Tab character detection error
console.log('Test 3: Rejecting tab characters...');
const tabCode = `Adventure "Tabs":\n\tBegin at Start.\n\nScene Start:\n\tConclude.`;
const tabResult = parseQuestLangMock(tabCode);
assert(!tabResult.valid, 'Tabs should cause validation to fail');
assert(tabResult.errors.some(e => e.message.includes('Tab characters are strictly forbidden')), 'Should report tab error message');
console.log('✓ Test 3 passed!');

// Test 4: Missing Adventure header
console.log('Test 4: Catching missing Adventure header...');
const noHeaderCode = `Scene Start:\n    Conclude.`;
const noHeaderResult = parseQuestLangMock(noHeaderCode);
assert(!noHeaderResult.valid, 'Missing Adventure header should fail');
assert(noHeaderResult.errors.some(e => e.message.includes('Missing Adventure header')), 'Should report missing Adventure error');
console.log('✓ Test 4 passed!');

// Test 5: Missing Begin at
console.log('Test 5: Catching missing Begin at...');
const noBeginCode = `Adventure "No Begin":\n\nScene Start:\n    Conclude.`;
const noBeginResult = parseQuestLangMock(noBeginCode);
assert(!noBeginResult.valid, 'Missing Begin at should fail');
assert(noBeginResult.errors.some(e => e.message.includes('Missing starting scene declaration')), 'Should report missing begin');
console.log('✓ Test 5 passed!');

// Test 6: Undefined target scene in Option
console.log('Test 6: Catching undefined target scene in Option...');
const badOptionCode = `Adventure "Bad Target":\n    Begin at Start.\n\nScene Start:\n    Option "Go into void" leads to GhostTown.\n\nScene GhostTown:\n    Conclude.`;
const validOptionResult = parseQuestLangMock(badOptionCode);
assert(validOptionResult.valid, 'Should be valid when GhostTown exists');

const missingOptionCode = `Adventure "Bad Target":\n    Begin at Start.\n\nScene Start:\n    Option "Go into void" leads to MissingScene.`;
const missingOptionResult = parseQuestLangMock(missingOptionCode);
assert(!missingOptionResult.valid, 'Missing target scene should fail');
assert(missingOptionResult.errors.some(e => e.message.includes('MissingScene')), 'Should report MissingScene error');
console.log('✓ Test 6 passed!');

// Test 7: Duplicate scene identifier
console.log('Test 7: Catching duplicate scene identifiers...');
const dupCode = `Adventure "Duplicate":\n    Begin at Start.\n\nScene Start:\n    Conclude.\n\nScene Start:\n    Conclude.`;
const dupResult = parseQuestLangMock(dupCode);
assert(!dupResult.valid, 'Duplicate scene should fail');
assert(dupResult.errors.some(e => e.message.includes('Duplicate Scene identifier')), 'Should report duplicate scene error');
console.log('✓ Test 7 passed!');

// Test 8: Unreachable scene warning
console.log('Test 8: Detecting unreachable scene warning...');
const cryptResult = parseQuestLangMock(SAMPLE_ADVENTURES[2].code);
assert(cryptResult.valid, 'Unreachable scene is a warning, not fatal error');
assert(cryptResult.errors.some(e => e.severity === 'warning' && e.message.includes('SecretObservatory')), 'Should warn about SecretObservatory');
console.log('✓ Test 8 passed!');

// Test 9: Conflicting exits in a scene
console.log('Test 9: Catching conflicting exits in a scene...');
const conflictCode = `Adventure "Conflict":\n    Begin at Start.\n\nScene Start:\n    Option "Go" leads to End.\n    Conclude.\n\nScene End:\n    Conclude.`;
const conflictResult = parseQuestLangMock(conflictCode);
assert(!conflictResult.valid, 'Conflicting exits should fail');
console.log('✓ Test 9 passed!');

console.log('\nAll 9 mock engine tests passed successfully! 🎉');
