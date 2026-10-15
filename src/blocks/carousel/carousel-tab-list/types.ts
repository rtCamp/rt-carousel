export type TabListAttributes = {
	labels: string[];
	activeTabBackgroundColor: string;
	activeTabTextColor: string;
	inactiveTabBackgroundColor: string;
	inactiveTabTextColor: string;
	// WP auto-registers these via supports
	layout?: {
		type?: string;
		justifyContent?: string;
		orientation?: string;
		flexWrap?: string;
	};
	style?: {
		spacing?: {
			blockGap?: string;
		};
		border?: {
			color?: string;
			width?: string;
			style?: string;
			radius?: string;
		};
	};
};

export type TabContext = {
	snap?: { index?: number };
	dotLabels?: string[];
	carouselId?: string;
	selectedIndex?: number;
	scrollSnaps?: { index: number }[];
};
