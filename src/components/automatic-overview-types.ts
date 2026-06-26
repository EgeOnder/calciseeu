import type { ReactNode } from 'react';

import type { AutomaticDocumentRef } from '@/src/lib/automatic';

export type OverviewIcon = 'documents' | 'insights' | 'warnings' | 'result';

export type AutomaticOverviewRow = {
	label: string;
	value: ReactNode;
};

export type AutomaticOverviewSection = {
	id: string;
	title: string;
	icon: OverviewIcon;
	description?: ReactNode;
	rows?: AutomaticOverviewRow[];
	/** When set, the section renders the uploaded documents as a list. */
	documents?: AutomaticDocumentRef[];
	defaultOpen?: boolean;
};

export function hasAutomaticOverviewContent(
	sections: AutomaticOverviewSection[],
) {
	return sections.some(
		(section) =>
			section.description ||
			(section.rows?.length ?? 0) > 0 ||
			(section.documents?.length ?? 0) > 0,
	);
}
