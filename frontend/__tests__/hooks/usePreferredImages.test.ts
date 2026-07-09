import { renderHook, act } from '@testing-library/react';
import { usePreferredImages } from '@/lib/hooks/usePreferredImages';
import type { ProjectCard } from '@/types/project';

const mockProject: ProjectCard = {
  id: 'p1',
  name: 'Test Project',
  slug: 'test-project',
  sector: 'Sector 10',
  city: 'Noida',
  builder: { name: 'Builder A', slug: 'builder-a', credai_member: false, delivered_units: 0, awards_count: 0, legal_flag: null },
  status: 'ready_to_move',
  possession_label: null,
  price_range_label: '₹1-2 Cr',
  images: [
    { url: 'https://example.com/hero.jpg', image_type: 'hero' },
    { url: 'https://example.com/exterior.jpg', image_type: 'exterior' },
    { url: 'https://example.com/other.jpg', image_type: 'other' }
  ],
  hero_image_url: 'https://example.com/fallback.jpg',
  unit_types: [],
  amenities: [],
  connections: [],
  rera_number: null,
  best_for: null,
  match_score: 50,
  match_reason: null,
  match_signals: [],
  match_reasons: [],
  concerns: [],
  decisionIntelligence: null,
};

describe('usePreferredImages', () => {
  it('prefers hero image first', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));
    expect(result.current.activeUrl).toBe('https://example.com/hero.jpg');
    expect(result.current.imgIdx).toBe(0);
  });

  it('falls back to exterior image if hero missing', () => {
    const project = { ...mockProject, images: [{ url: 'https://example.com/exterior.jpg', image_type: 'exterior' }] };
    const { result } = renderHook(() => usePreferredImages(project));
    expect(result.current.activeUrl).toBe('https://example.com/exterior.jpg');
  });

  it('falls back to hero_image_url if no images array', () => {
    const project = { ...mockProject, images: [] };
    const { result } = renderHook(() => usePreferredImages(project));
    expect(result.current.activeUrl).toBe('https://example.com/fallback.jpg');
  });

  it('tracks failed URLs and rotates to next', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));
    expect(result.current.activeUrl).toBe('https://example.com/hero.jpg');

    act(() => {
      result.current.markImageFailed('https://example.com/hero.jpg');
    });

    expect(result.current.workingImages.length).toBe(2);
    expect(result.current.allFailed).toBe(false);
  });

  it('detects all images failed', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));

    act(() => {
      result.current.markImageFailed('https://example.com/hero.jpg');
      result.current.markImageFailed('https://example.com/exterior.jpg');
      result.current.markImageFailed('https://example.com/other.jpg');
    });

    expect(result.current.allFailed).toBe(true);
    expect(result.current.workingImages.length).toBe(0);
  });

  it('navigates between images', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));
    expect(result.current.imgIdx).toBe(0);

    act(() => {
      result.current.nextImg();
    });
    expect(result.current.imgIdx).toBe(1);

    act(() => {
      result.current.prevImg();
    });
    expect(result.current.imgIdx).toBe(0);
  });

  it('returns hasMultiple = true with 2+ images', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));
    expect(result.current.hasMultiple).toBe(true);
  });

  it('returns hasMultiple = false with 1 image', () => {
    const project = { ...mockProject, images: [{ url: 'https://example.com/hero.jpg', image_type: 'hero' }] };
    const { result } = renderHook(() => usePreferredImages(project));
    expect(result.current.hasMultiple).toBe(false);
  });

  it('supports detailImages parameter override', () => {
    const detailImages = [
      { url: 'https://example.com/detail1.jpg', image_type: 'hero' },
      { url: 'https://example.com/detail2.jpg', image_type: 'exterior' }
    ];
    const { result } = renderHook(() => usePreferredImages(mockProject, detailImages));
    expect(result.current.activeUrl).toBe('https://example.com/detail1.jpg');
  });

  it('handles null project gracefully', () => {
    const { result } = renderHook(() => usePreferredImages(null));
    expect(result.current.activeUrl).toBeUndefined();
    expect(result.current.workingImages.length).toBe(0);
    expect(result.current.allFailed).toBe(true);
  });

  it('wraps image navigation at boundaries', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));

    act(() => {
      result.current.setImgIdx(2); // last image
      result.current.nextImg();
    });
    expect(result.current.imgIdx).toBe(0); // wraps to start
  });
});
