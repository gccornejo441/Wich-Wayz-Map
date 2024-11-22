interface LogoProps {
  className?: string;
  imageSource: string;
  onClick?: () => void;
}

const Logo = ({ className, imageSource }: LogoProps) => {
  return (
    <div
      className={`bg-primary w-fit p-2 rounded-full shadow-md shadow-gray-600 flex items-center space-x-3 ${className}`}
    >
      <span className="flex items-center">
        <img src={imageSource} className="h-10" alt="Wich Way Logo" />
      </span>
    </div>
  );
};

export default Logo;
