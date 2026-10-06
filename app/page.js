import { DM_Serif_Text } from 'next/font/google';
import SpaceeHome from '@/components/SpaceeHome';

const headingFont = DM_Serif_Text({ weight: '400', subsets: ['latin'] });

export default function Home() {
  return <SpaceeHome headingClassName={headingFont.className} />;
}
