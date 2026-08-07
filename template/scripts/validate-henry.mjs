import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const templateDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = async (relativePath) => {
  const absolutePath = path.join(templateDir, relativePath);

  try {
    return JSON.parse(await readFile(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to load ${relativePath}: ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const isAbsolutePath = (value) =>
  path.posix.isAbsolute(value) ||
  path.win32.isAbsolute(value) ||
  /^[a-zA-Z]:[\\/]/u.test(value);

const validateTimeline = (timeline) => {
  assert(Array.isArray(timeline), 'timeline.json must contain an array');
  assert(timeline.length > 0, 'timeline.json must contain at least one scene');

  let expectedFrom = 0;
  for (const [index, scene] of timeline.entries()) {
    assert(typeof scene?.id === 'string' && scene.id.length > 0, `Scene ${index} needs an id`);
    assert(Number.isInteger(scene.from), `Scene ${scene.id} must have an integer from value`);
    assert(Number.isInteger(scene.duration) && scene.duration > 0, `Scene ${scene.id} must have a positive integer duration`);
    assert(scene.from === expectedFrom, `Scene ${scene.id} must start at frame ${expectedFrom}, received ${scene.from}`);
    expectedFrom = scene.from + scene.duration;
  }

  assert(expectedFrom === 1200, `Timeline must total exactly 1200 frames, received ${expectedFrom}`);
};

const validateProps = (props) => {
  for (const key of ['company', 'oneLinePosition', 'problem', 'nextDiligence']) {
    assert(typeof props?.[key] === 'string' && props[key].trim().length > 0, `Props field ${key} must be a non-empty string`);
  }

  assert(Array.isArray(props.thesisPoints) && props.thesisPoints.length === 3, 'Props must contain exactly three thesis points');
  assert(props.thesisPoints.every((point) => typeof point === 'string' && point.trim().length > 0), 'Every thesis point must be a non-empty string');
  assert(Array.isArray(props.risks) && props.risks.length === 2, 'Props must contain exactly two risks');
  assert(props.risks.every((risk) => typeof risk === 'string' && risk.trim().length > 0), 'Every risk must be a non-empty string');
  assert(Array.isArray(props.slideImages) && props.slideImages.length > 0, 'Props must contain slide image paths');
  assert(props.slideImages.every((image) => typeof image === 'string' && image.trim().length > 0), 'Every slide image path must be a non-empty string');
  assert(props.slideImages.every((image) => !isAbsolutePath(image)), 'Slide image paths must be relative');
};

try {
  const timeline = await readJson('src/henry/timeline.json');
  const props = await readJson('private/props.example.json');

  validateTimeline(timeline);
  validateProps(props);
  console.log('Henry MVP contract validation passed.');
} catch (error) {
  console.error(`Henry MVP contract validation failed: ${error.message}`);
  process.exitCode = 1;
}
