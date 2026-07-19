interface FooterNavProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function FooterNav({ currentIndex, total, onPrev, onNext }: FooterNavProps) {
  return (
    <footer className="gr-footer-nav">
      <button className="gr-nav-btn gr-secondary" onClick={onPrev} disabled={currentIndex === 0}>
        ← Previous
      </button>
      <button className="gr-nav-btn" onClick={onNext} disabled={currentIndex >= total - 1}>
        Next →
      </button>
    </footer>
  );
}
