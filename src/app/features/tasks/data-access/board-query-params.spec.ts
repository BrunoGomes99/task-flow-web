import { convertToParamMap } from '@angular/router';

import { DEFAULT_BOARD_FILTERS, type BoardFilters } from '../models/board-filters';
import { parseBoardFilters, toBoardQueryParams } from './board-query-params';

describe('parseBoardFilters', () => {
  it('uses the defaults when the query is empty and does not ask to normalize', () => {
    expect(parseBoardFilters(convertToParamMap({}))).toEqual({
      filters: DEFAULT_BOARD_FILTERS,
      needsNormalization: false,
    });
  });

  it('trims the text filters and flags the raw query', () => {
    const parsed = parseBoardFilters(
      convertToParamMap({ title: '  pagar boleto  ', description: '  conta de luz  ' }),
    );

    expect(parsed.filters.title).toBe('pagar boleto');
    expect(parsed.filters.description).toBe('conta de luz');
    expect(parsed.needsNormalization).toBe(true);
  });

  it('treats blank text as empty and flags the param for removal', () => {
    const parsed = parseBoardFilters(convertToParamMap({ title: '   ', description: '   ' }));

    expect(parsed.filters.title).toBe('');
    expect(parsed.filters.description).toBe('');
    expect(parsed.needsNormalization).toBe(true);
  });

  it('returns statuses in board order and flags a list that is not canonical', () => {
    const parsed = parseBoardFilters(convertToParamMap({ status: 'completed,pending' }));

    expect(parsed.filters.statuses).toEqual(['pending', 'completed']);
    expect(parsed.needsNormalization).toBe(true);
  });

  it('trims each status token and drops unknown values', () => {
    expect(
      parseBoardFilters(convertToParamMap({ status: ' completed , foo ' })).filters.statuses,
    ).toEqual(['completed']);
  });

  it('treats a status list that becomes empty as every column', () => {
    const parsed = parseBoardFilters(convertToParamMap({ status: 'foo,bar' }));

    expect(parsed.filters.statuses).toEqual(['pending', 'inProgress', 'completed']);
    expect(parsed.needsNormalization).toBe(true);
  });

  it('drops duplicate statuses', () => {
    const parsed = parseBoardFilters(convertToParamMap({ status: 'pending,pending' }));

    expect(parsed.filters.statuses).toEqual(['pending']);
    expect(parsed.needsNormalization).toBe(true);
  });

  it('parses status=completed,foo and order=sideways as completed, ascending, and flags normalization', () => {
    expect(
      parseBoardFilters(convertToParamMap({ status: 'completed,foo', order: 'sideways' })),
    ).toEqual({
      filters: {
        title: '',
        description: '',
        statuses: ['completed'],
        order: 'asc',
      },
      needsNormalization: true,
    });
  });

  it('keeps a canonical query as-is', () => {
    expect(
      parseBoardFilters(
        convertToParamMap({
          title: 'boleto',
          description: 'luz',
          status: 'pending,completed',
          order: 'desc',
        }),
      ),
    ).toEqual({
      filters: {
        title: 'boleto',
        description: 'luz',
        statuses: ['pending', 'completed'],
        order: 'desc',
      },
      needsNormalization: false,
    });
  });

  it('flags a query that spells out the default statuses and order', () => {
    const parsed = parseBoardFilters(
      convertToParamMap({ status: 'pending,inProgress,completed', order: 'asc' }),
    );

    expect(parsed.filters).toEqual(DEFAULT_BOARD_FILTERS);
    expect(parsed.needsNormalization).toBe(true);
  });
});

describe('toBoardQueryParams', () => {
  it('omits empty text, every status and ascending order', () => {
    expect(toBoardQueryParams(DEFAULT_BOARD_FILTERS)).toEqual({});
  });

  it('writes the visible statuses in board order and keeps descending order', () => {
    const filters: BoardFilters = {
      title: 'boleto',
      description: '',
      statuses: ['completed', 'pending'],
      order: 'desc',
    };

    expect(toBoardQueryParams(filters)).toEqual({
      title: 'boleto',
      status: 'pending,completed',
      order: 'desc',
    });
  });

  it('round-trips normalized filters through the query string', () => {
    const filters: BoardFilters = {
      title: 'boleto',
      description: 'luz',
      statuses: ['inProgress'],
      order: 'desc',
    };

    const parsed = parseBoardFilters(convertToParamMap(toBoardQueryParams(filters)));

    expect(parsed.filters).toEqual(filters);
    expect(parsed.needsNormalization).toBe(false);
  });
});
