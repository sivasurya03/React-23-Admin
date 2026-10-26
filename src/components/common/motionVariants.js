export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
export const staggerChild = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}
