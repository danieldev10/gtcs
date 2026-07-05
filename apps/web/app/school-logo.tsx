import Image from 'next/image';
import logo from '../src/logo/logo.png';

const logoSizes = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
} as const;

type SchoolLogoProps = {
  size?: keyof typeof logoSizes;
};

export function SchoolLogo({ size = 'md' }: SchoolLogoProps) {
  return (
    <div className={`${logoSizes[size]} overflow-hidden rounded-md border border-line bg-white shadow-sm`}>
      <Image
        alt="American University of Nigeria logo"
        className="h-full w-full object-cover"
        height={435}
        priority
        src={logo}
        width={435}
      />
    </div>
  );
}
