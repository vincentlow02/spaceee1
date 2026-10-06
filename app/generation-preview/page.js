import { DM_Serif_Text } from 'next/font/google';
import GenerationPreview from './GenerationPreview';

const headingFont = DM_Serif_Text({weight:'400',subsets:['latin']});

export default function GenerationPreviewPage() {
  return <GenerationPreview headingClassName={headingFont.className} />;
}
