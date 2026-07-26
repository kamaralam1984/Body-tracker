// Testing-library normally sets this automatically; since these tests use
// react-dom/client directly (deliberately, to avoid a peer-dependency
// conflict between @testing-library/react and this monorepo's pinned
// react/react-dom versions — see the tsup build notes), it's set here.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
