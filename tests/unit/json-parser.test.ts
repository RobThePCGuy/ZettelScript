import { describe, it, expect } from 'vitest';
import { parseJSONWithFallbacks } from '../../src/extraction/json-parser.js';

describe('parseJSONWithFallbacks', () => {
  describe('strict mode', () => {
    it('parses valid JSON', () => {
      const result = parseJSONWithFallbacks('{"characters":[{"name":"Alice"}]}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('strict');
        expect(result.values).toHaveLength(1);
        expect(result.values[0]).toEqual({ characters: [{ name: 'Alice' }] });
      }
    });

    it('handles JSON with whitespace', () => {
      const result = parseJSONWithFallbacks(`
        {
          "characters": [
            {"name": "Alice"}
          ]
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('strict');
      }
    });

    it('strips markdown code fences', () => {
      const result = parseJSONWithFallbacks('```json\n{"name":"test"}\n```');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('strict');
        expect(result.values[0]).toEqual({ name: 'test' });
      }
    });

    it('finds JSON within surrounding text', () => {
      const result = parseJSONWithFallbacks('Here is the data: {"name":"test"} done.');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('strict');
        expect(result.values[0]).toEqual({ name: 'test' });
      }
    });

    it('handles arrays at top level', () => {
      const result = parseJSONWithFallbacks('[{"name":"Alice"},{"name":"Bob"}]');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('strict');
        expect(result.values[0]).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
      }
    });
  });

  describe('repair mode', () => {
    it('repairs trailing commas', () => {
      const result = parseJSONWithFallbacks('{"characters":[{"name":"Alice"},]}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('repaired');
      }
    });

    it('repairs single quotes', () => {
      const result = parseJSONWithFallbacks("{'name':'test'}");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('repaired');
        expect(result.values[0]).toEqual({ name: 'test' });
      }
    });

    it('repairs unquoted keys', () => {
      const result = parseJSONWithFallbacks('{name:"test"}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('repaired');
        expect(result.values[0]).toEqual({ name: 'test' });
      }
    });

    it('repairs missing commas between properties', () => {
      const result = parseJSONWithFallbacks('{"name":"test" "value":123}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('repaired');
      }
    });
  });

  describe('salvage mode', () => {
    it('salvages multiple JSON islands', () => {
      const input =
        '{"characters":[{"name":"Alice"}]} some garbage {"locations":[{"name":"Paris"}]}';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('salvaged');
        expect(result.values).toHaveLength(2);
        expect(result.warnings).toBeDefined();
        expect(result.warnings?.[0]).toContain('salvage');
      }
    });

    it('handles braces inside strings correctly', () => {
      const result = parseJSONWithFallbacks('{"text":"this } is inside a string"}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should parse in strict mode since the brace is inside a string
        expect(result.values[0]).toEqual({ text: 'this } is inside a string' });
      }
    });

    it('handles escaped quotes inside strings', () => {
      const result = parseJSONWithFallbacks('{"text":"she said \\"hello\\""}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values[0]).toEqual({ text: 'she said "hello"' });
      }
    });

    it('skips islands smaller than 20 characters', () => {
      const input = '{"a":1} garbage {"characters":[{"name":"Alice"}]}';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // First island {"a":1} is only 7 chars, should be skipped
        expect(result.values).toHaveLength(1);
        expect(result.values[0]).toEqual({ characters: [{ name: 'Alice' }] });
      }
    });

    it('skips empty objects and arrays', () => {
      const input = '{} garbage {"name":"test with enough chars"}';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Empty {} should be filtered out even if it parses
        expect(result.values.every((v) => Object.keys(v as object).length > 0)).toBe(true);
      }
    });
  });

  describe('failure mode', () => {
    it('repairs plain text to string (jsonrepair is aggressive)', () => {
      // Note: jsonrepair turns "not json at all" into the string "not json at all"
      // which is valid JSON. The extractor's schema validation will reject it.
      const result = parseJSONWithFallbacks('not json at all');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('repaired');
        expect(result.values[0]).toBe('not json at all');
      }
    });

    it('repairs incomplete JSON', () => {
      // jsonrepair can fix many broken JSON patterns
      const result = parseJSONWithFallbacks('{invalid json that cannot be repaired');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('repaired');
      }
    });

    it('fails on truly unparseable input', () => {
      // Empty braces with no content - salvage filters this as empty
      const result = parseJSONWithFallbacks('');
      expect(result.ok).toBe(false);
    });

    it('truncates rawSnippet to 500 chars on failure', () => {
      // Use input that results in empty object after repair, then gets filtered
      const longInput = '   ' + ' '.repeat(1000) + '   ';
      const result = parseJSONWithFallbacks(longInput);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.rawSnippet.length).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = parseJSONWithFallbacks('');
      expect(result.ok).toBe(false);
    });

    it('handles whitespace-only input', () => {
      const result = parseJSONWithFallbacks('   \n\t  ');
      expect(result.ok).toBe(false);
    });

    it('handles nested objects', () => {
      const input = '{"outer":{"inner":{"deep":"value"}}}';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values[0]).toEqual({ outer: { inner: { deep: 'value' } } });
      }
    });

    it('handles nested arrays', () => {
      const input = '[[1,2],[3,4]]';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values[0]).toEqual([
          [1, 2],
          [3, 4],
        ]);
      }
    });

    it('handles unicode characters', () => {
      const result = parseJSONWithFallbacks('{"name":"日本語"}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values[0]).toEqual({ name: '日本語' });
      }
    });

    it('handles newlines in strings', () => {
      const result = parseJSONWithFallbacks('{"text":"line1\\nline2"}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values[0]).toEqual({ text: 'line1\nline2' });
      }
    });
  });

  describe('LLM-specific patterns', () => {
    it('handles markdown fence with json label', () => {
      const input = '```json\n{"characters": [{"name": "Alice"}]}\n```';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('strict');
      }
    });

    it('handles markdown fence without json label', () => {
      const input = '```\n{"characters": [{"name": "Alice"}]}\n```';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mode).toBe('strict');
      }
    });

    it('handles response with explanation before JSON', () => {
      const input = 'Here are the extracted entities:\n\n{"characters": [{"name": "Alice"}]}';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.values[0]).toEqual({ characters: [{ name: 'Alice' }] });
      }
    });

    it('handles response with explanation after JSON', () => {
      const input = '{"characters": [{"name": "Alice"}]}\n\nI found 1 character.';
      const result = parseJSONWithFallbacks(input);
      expect(result.ok).toBe(true);
    });
  });
});
