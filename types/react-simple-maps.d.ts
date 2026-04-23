declare module 'react-simple-maps' {
  import { FC, ReactNode, MouseEvent, CSSProperties } from 'react';

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      center?: [number, number];
      scale?: number;
      rotate?: [number, number, number];
    };
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  }
  export const ComposableMap: FC<ComposableMapProps>;

  export interface GeographiesProps {
    geography: string | object;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: (props: { geographies: any[] }) => ReactNode;
  }
  export const Geographies: FC<GeographiesProps>;

  export interface GeographyProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: CSSProperties & { outline?: string };
      hover?: CSSProperties & { outline?: string; fill?: string };
      pressed?: CSSProperties & { outline?: string };
    };
    [key: string]: unknown;
  }
  export const Geography: FC<GeographyProps>;

  export interface MarkerProps {
    coordinates: [number, number];
    onClick?: (event: MouseEvent<SVGGElement>) => void;
    onMouseEnter?: (event: MouseEvent<SVGGElement>) => void;
    onMouseLeave?: (event: MouseEvent<SVGGElement>) => void;
    children?: ReactNode;
  }
  export const Marker: FC<MarkerProps>;

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    children?: ReactNode;
  }
  export const ZoomableGroup: FC<ZoomableGroupProps>;
}
