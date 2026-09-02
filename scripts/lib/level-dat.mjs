import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { requireCondition } from "./project-files.mjs";

const tag = {
  end: 0,
  byte: 1,
  short: 2,
  int: 3,
  long: 4,
  float: 5,
  double: 6,
  byteArray: 7,
  string: 8,
  list: 9,
  compound: 10,
  intArray: 11,
  longArray: 12,
};

function requireAvailable(buffer, offset, length) {
  requireCondition(
    Number.isInteger(offset) &&
      Number.isInteger(length) &&
      offset >= 0 &&
      length >= 0 &&
      offset + length <= buffer.length,
    "level.dat contains truncated NBT data",
  );
}

function readUnsignedShort(buffer, offset) {
  requireAvailable(buffer, offset, 2);
  return buffer.readUInt16LE(offset);
}

function readLength(buffer, offset) {
  requireAvailable(buffer, offset, 4);
  const length = buffer.readInt32LE(offset);
  requireCondition(length >= 0, "level.dat contains a negative NBT length");
  return length;
}

function skipPayload(buffer, type, offset) {
  const fixedSizes = {
    [tag.byte]: 1,
    [tag.short]: 2,
    [tag.int]: 4,
    [tag.long]: 8,
    [tag.float]: 4,
    [tag.double]: 8,
  };

  if (fixedSizes[type] !== undefined) {
    requireAvailable(buffer, offset, fixedSizes[type]);
    return offset + fixedSizes[type];
  }

  if (type === tag.byteArray || type === tag.intArray || type === tag.longArray) {
    const length = readLength(buffer, offset);
    const itemSize = type === tag.byteArray ? 1 : type === tag.intArray ? 4 : 8;
    requireAvailable(buffer, offset + 4, length * itemSize);
    return offset + 4 + length * itemSize;
  }

  if (type === tag.string) {
    const length = readUnsignedShort(buffer, offset);
    requireAvailable(buffer, offset + 2, length);
    return offset + 2 + length;
  }

  if (type === tag.list) {
    requireAvailable(buffer, offset, 5);
    const itemType = buffer[offset];
    const length = readLength(buffer, offset + 1);
    let cursor = offset + 5;
    for (let index = 0; index < length; index += 1) {
      cursor = skipPayload(buffer, itemType, cursor);
    }
    return cursor;
  }

  if (type === tag.compound) {
    let cursor = offset;
    while (true) {
      requireAvailable(buffer, cursor, 1);
      const childType = buffer[cursor];
      cursor += 1;
      if (childType === tag.end) {
        return cursor;
      }
      const nameLength = readUnsignedShort(buffer, cursor);
      cursor += 2;
      requireAvailable(buffer, cursor, nameLength);
      cursor += nameLength;
      cursor = skipPayload(buffer, childType, cursor);
    }
  }

  throw new Error(`level.dat contains unsupported NBT tag type ${type}`);
}

function locateTagsInCompound(buffer, compoundOffset, names) {
  let cursor = compoundOffset;
  const wanted = new Set(names);
  const entries = new Map();
  while (true) {
    requireAvailable(buffer, cursor, 1);
    const childType = buffer[cursor];
    cursor += 1;
    if (childType === tag.end) {
      break;
    }

    const nameLength = readUnsignedShort(buffer, cursor);
    cursor += 2;
    requireAvailable(buffer, cursor, nameLength);
    const name = buffer.toString("utf8", cursor, cursor + nameLength);
    cursor += nameLength;
    const payloadOffset = cursor;

    if (wanted.has(name)) {
      requireCondition(!entries.has(name), `${name} occurs more than once in level.dat`);
      entries.set(name, { type: childType, payloadOffset });
    }
    cursor = skipPayload(buffer, childType, payloadOffset);
  }

  for (const name of names) {
    requireCondition(entries.has(name), `level.dat is missing ${name}`);
  }
  return entries;
}

function locateRootTags(buffer, names) {
  requireAvailable(buffer, 0, 11);
  const declaredLength = buffer.readUInt32LE(4);
  requireCondition(
    declaredLength === buffer.length - 8,
    "level.dat header length does not match its NBT payload",
  );

  let cursor = 8;
  requireCondition(buffer[cursor] === tag.compound, "level.dat root must be a compound tag");
  cursor += 1;
  const rootNameLength = readUnsignedShort(buffer, cursor);
  cursor += 2;
  requireAvailable(buffer, cursor, rootNameLength);
  cursor += rootNameLength;
  return locateTagsInCompound(buffer, cursor, names);
}

function locateRootByteTags(buffer, names) {
  const entries = locateRootTags(buffer, names);
  return new Map(
    [...entries].map(([name, entry]) => {
      requireCondition(entry.type === tag.byte, `${name} must be a byte tag in level.dat`);
      return [name, entry.payloadOffset];
    }),
  );
}

const rootWorldFlagNames = [
  "bonusChestEnabled",
  "bonusChestSpawned",
  "cheatsEnabled",
  "commandsEnabled",
];
const experimentFlagNames = [
  "experiments_ever_used",
  "saved_with_toggled_experiments",
];

export function readWorldFlags(buffer) {
  const rootOffsets = locateRootByteTags(buffer, rootWorldFlagNames);
  const experiments = locateRootTags(buffer, ["experiments"]).get("experiments");
  requireCondition(
    experiments.type === tag.compound,
    "experiments must be a compound tag in level.dat",
  );
  const experimentEntries = locateTagsInCompound(
    buffer,
    experiments.payloadOffset,
    experimentFlagNames,
  );
  const experimentOffsets = new Map(
    [...experimentEntries].map(([name, entry]) => {
      requireCondition(entry.type === tag.byte, `${name} must be a byte tag in level.dat`);
      return [name, entry.payloadOffset];
    }),
  );
  return Object.fromEntries([
    ...rootWorldFlagNames.map((name) => [name, buffer[rootOffsets.get(name)]]),
    ...experimentFlagNames.map((name) => [
      name,
      buffer[experimentOffsets.get(name)],
    ]),
  ]);
}

export async function enableStarterChest(projectRoot) {
  const levelFile = path.join(
    projectRoot,
    "world",
    "die_zauberschmiede",
    "level.dat",
  );
  const temporaryFile = `${levelFile}.tmp`;
  const original = await readFile(levelFile);
  const offsets = locateRootByteTags(original, [
    "bonusChestEnabled",
    "bonusChestSpawned",
  ]);
  const updated = Buffer.from(original);
  updated[offsets.get("bonusChestEnabled")] = 1;
  updated[offsets.get("bonusChestSpawned")] = 0;

  await writeFile(temporaryFile, updated);
  readWorldFlags(await readFile(temporaryFile));
  await rename(temporaryFile, levelFile);
  return readWorldFlags(updated);
}
