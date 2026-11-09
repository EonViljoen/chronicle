import { createContext, useContext } from 'react';

/*
 * Can the timeline on screen be edited? False for published timelines and
 * on read-only sites.
 *
 * This is React Context: TimelineGate provides the value once, and any
 * component inside it can read it with useCanEdit(), however deep, without
 * every component in between passing it along as a prop. The default (true)
 * applies outside any provider.
 */
export const CanEditContext = createContext(true);

export const useCanEdit = () => useContext(CanEditContext);
