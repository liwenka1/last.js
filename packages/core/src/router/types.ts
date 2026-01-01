export interface Route {
  path: string;
  filePath: string;
  params: string[];
  isDynamic: boolean;
}

export interface RouteModule {
  default?: React.ComponentType<any>;
  generateMetadata?: (props: any) => Promise<any> | any;
}

export interface LayoutModule {
  default: React.ComponentType<{ children: React.ReactNode }>;
}
