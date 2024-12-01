interface LogoProps {
  className?: string;
  imageSource: string;
  onClick?: () => void;
}

const Logo = ({ className, imageSource }: LogoProps) => {
  return (
    <div>
      <span className="flex items-center">
        <img src={imageSource} className={`${className}`} alt="Wich Way Logo" />
      </span>
    </div>
  );
};

export default Logo;
