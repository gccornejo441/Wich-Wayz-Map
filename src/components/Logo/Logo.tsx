interface LogoProps {
  className?: string;
  imageSource: string;
}

const Logo = ({ className, imageSource }: LogoProps) => {
  return (
    <div
      className={`bg-primary w-fit p-2 rounded-full shadow-md shadow-gray-600 flex items-center space-x-3 ${className}`}
    >
      <a href="/" className="flex items-center">
        <img src={imageSource} className="h-10" alt="Wich Way Logo" />
      </a>
    </div>
  );
};

export default Logo;
