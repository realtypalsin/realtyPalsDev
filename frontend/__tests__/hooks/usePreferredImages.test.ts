import { renderHook, act } from '@testing-library/react';
import { usePreferredImages } from '@/lib/hooks/usePreferredImages';
import type { ProjectCard } from '@/types/project';

const mockProject: ProjectCard = {
  id: 'p1',
  name: 'Test Project',
  slug: 'test-project',
  sector: 'Sector 10',
  city: 'Noida',
  builder: { name: 'Builder A', slug: 'builder-a' },
  status: 'ready_to_move',
  possession_date: null,
  possession_label: null,
  price_range_label: '₹1-2 Cr',
  marketing_claims: [],
  images: [
    { id: 'i1', url: 'https://example.com/hero.jpg', type: 'hero', caption: null, bhk: null, size_sqft: null, sort_order: 0 },
    { id: 'i2', url: 'https://example.com/exterior.jpg', type: 'exterior', caption: null, bhk: null, size_sqft: null, sort_order: 1 },
    { id: 'i3', url: 'https://example.com/other.jpg', type: 'other', caption: null, bhk: null, size_sqft: null, sort_order: 2 },
  ],
  hero_image_url: 'https://example.com/fallback.jpg',
  unit_types: [],
  top_amenities: [],
  top_connectivity: [],
};

describe('usePreferredImages', () => {
  it('prefers hero image first', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));
    expect(result.current.activeUrl).toBe('https://example.com/hero.jpg');
    expect(result.current.imgIdx).toBe(0);
  });

  it('falls back to exterior image if hero missing', () => {
    const project = { ...mockProject, images: [{ id: 'i1', url: 'https://example.com/exterior.jpg', type: 'exterior', caption: null, bhk: null, size_sqft: null, sort_order: 0 }] };
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

    expect(result.current.workingImages.length).toBe(1);
    expect(result.current.allFailed).toBe(false);
  });

  it('detects all images failed', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));

    act(() => {
      result.current.markImageFailed('https://example.com/hero.jpg');
      result.current.markImageFailed('https://example.com/exterior.jpg');
    });

    expect(result.current.allFailed).toBe(true);
    expect(result.current.workingImages.length).toBe(0);
  });

  it('navigates between images', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));
    expect(result.current.imgIdx).toBe(0);

    act(() => {
      result.current.nextImg({ stopPropagation: () => {} } as any);
    });
    expect(result.current.imgIdx).toBe(1);

    act(() => {
      result.current.prevImg({ stopPropagation: () => {} } as any);
    });
    expect(result.current.imgIdx).toBe(0);
  });

  it('returns hasMultiple = true with 2+ images', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));
    expect(result.current.hasMultiple).toBe(true);
  });

  it('returns hasMultiple = false with 1 image', () => {
    const project = { ...mockProject, images: [{ url: 'https://example.com/hero.jpg', type: 'hero', id: 'i1', caption: null, bhk: null, size_sqft: null, sort_order: 0 }] };
    const { result } = renderHook(() => usePreferredImages(project));
    expect(result.current.hasMultiple).toBe(false);
  });

  it('supports detailImages parameter override', () => {
    const detailImages = [
      { url: 'https://example.com/detail1.jpg', type: 'hero', id: 'i1', caption: null, bhk: null, size_sqft: null, sort_order: 0 },
      { url: 'https://example.com/detail2.jpg', type: 'exterior', id: 'i2', caption: null, bhk: null, size_sqft: null, sort_order: 1 }
    ];
    const { result } = renderHook(() => usePreferredImages(mockProject, detailImages));
    expect(result.current.activeUrl).toBe('https://example.com/detail1.jpg');
  });

  it('handles null project gracefully', () => {
    const { result } = renderHook(() => usePreferredImages(null));
    expect(result.current.activeUrl).toBeNull();
    expect(result.current.workingImages.length).toBe(0);
    expect(result.current.allFailed).toBe(false);
  });

  it('wraps image navigation at boundaries', () => {
    const { result } = renderHook(() => usePreferredImages(mockProject));

    act(() => {
      // should have 2 working images
      result.current.nextImg({ stopPropagation: () => {} } as any); // idx 1
      result.current.nextImg({ stopPropagation: () => {} } as any); // idx 2 -> wraps to 0
    });
    expect(result.current.imgIdx).toBe(0); // wraps to start
  });
});
