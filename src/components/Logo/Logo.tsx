import { Callback } from "../../types/dataTypes";

interface LogoProps {
  className?: string;
  imageSource: string;
  onClick?: Callback;
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
