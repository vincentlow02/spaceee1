import { DM_Serif_Text,Inter } from 'next/font/google';
import RefinementPreview from './RefinementPreview';

const headingFont = DM_Serif_Text({weight:'400',subsets:['latin']});
const navigationFont = Inter({subsets:['latin'],variable:'--font-spacee-navigation'});
export default function Page() { return <RefinementPreview headingClassName={headingFont.className} navigationFontClassName={navigationFont.variable}/>; }
