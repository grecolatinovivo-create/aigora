export default function HellGridBg() {
  return (
    <>
      <div style={{ position: 'absolute', bottom: 0, left: '-50%', right: '-50%', height: '60%', perspective: '600px', perspectiveOrigin: '50% 0%', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: 'rotateX(55deg)', transformOrigin: '50% 0%',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(160,0,20,0.4) 120px), ' +
            'repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(160,0,20,0.4) 120px)',
          backgroundSize: '120px 120px',
          animation: 'hell-grid-scroll 1.8s linear infinite',
        }} />
      </div>
      <div style={{
        position: 'absolute', top: '40%', left: 0, right: 0, height: '2px',
        background: 'rgba(220,0,30,0.6)',
        boxShadow: '0 0 40px 16px rgba(180,0,20,0.4), 0 0 120px 60px rgba(100,0,10,0.2)',
        animation: 'hell-horizon-pulse 3s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 80% at 50% 50%, transparent 30%, rgba(4,0,2,0.88) 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
    </>
  )
}
