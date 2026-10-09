import { DM_Serif_Text, Inter } from 'next/font/google';
import SpaceeHome from '@/components/SpaceeHome';

const headingFont = DM_Serif_Text({ weight: '400', subsets: ['latin'] });
const navigationFont = Inter({subsets:['latin'],variable:'--font-spacee-navigation'});

export default function Home() {
  return <SpaceeHome headingClassName={headingFont.className} navigationFontClassName={navigationFont.variable} />;
}
