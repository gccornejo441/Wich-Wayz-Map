const SidebarFooter = () => {
  return (
    <div className="px-4 mt-8 border-t border-white/20 pt-4">
      <p className="text-xs text-white/70">© 2024 Wich Wayz?</p>
      <div className="flex flex-wrap text-xs text-white/70 mt-2 space-x-4">
        <a
          href="https://en.wikipedia.org/wiki/Sandwich"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition"
        >
          About
        </a>
      </div>
    </div>
  );
};

export default SidebarFooter;
