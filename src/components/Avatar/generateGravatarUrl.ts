import md5 from "blueimp-md5";

const generateGravatarUrl = (
  email: string,
  size?: number,
  rating?: string,
  defaultImage?: string,
): string => {
  const hash = md5(email.trim().toLowerCase());
  let url = `https://www.gravatar.com/avatar/${hash}?`;

  if (size) url += `s=${size}&`;
  if (rating) url += `r=${rating}&`;
  if (defaultImage) url += `d=${defaultImage}`;

  return url;
};

export default generateGravatarUrl;
