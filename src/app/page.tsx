"use client";
import { useState, useMemo, useEffect } from "react";
import { GraphCanvas } from "reagraph";
import styles from "./page.module.css";

enum Status {
  Idle,
  Processing,
  Done
};

const colors = {
  [Status.Idle]: "gray",
  [Status.Processing]: "orange",
  [Status.Done]: "green",
}

type Request = {
  id: string;
  children_ids: string[];
  parent_ids: string[];
  time: number;
  promise?: Promise<any>;
  isRoot?: boolean;
  status: Status;
  processedParents: number;
};

type RequestsGraph = Record<string, Request>;

let graph: RequestsGraph = {
  "1": {
    id: "1",
    children_ids: ['2', '3', '6'],
    parent_ids: [],
    time: 1000,
    isRoot: true,
    status: Status.Idle,
    processedParents: 0,
  },
  "2": {
    id: "2",
    children_ids: ['4'],
    parent_ids: ['1'],
    time: 2000,
    status: Status.Idle,
    processedParents: 0,
  },
  "3": {
    id: "3",
    children_ids: ['4'],
    parent_ids: ['1'],
    time: 5000,
    status: Status.Idle,
    processedParents: 0,
  },
  "4": {
    id: "4",
    children_ids: ['5'],
    parent_ids: ['2', '3'],
    time: 1000,
    status: Status.Idle,
    processedParents: 0,
  },
  "5": {
    id: "5",
    children_ids: [],
    parent_ids: ['4', '6'],
    time: 1000,
    status: Status.Idle,
    processedParents: 0,
  },
  "6": {
    id: "6",
    children_ids: ['5'],
    parent_ids: ['1'],
    time: 10000,
    status: Status.Idle,
    processedParents: 0,
  }
};

function setGraphStatus(requestId: string, status: Status) {
  graph = {
    ...graph,
    [requestId]: {
      ...graph[requestId],
      status,
    }
  }
}

function addParentRequest(requestId: string) {
  console.log('graph', graph[requestId], requestId)
  graph = {
    ...graph,
    [requestId]: {
      ...graph[requestId],
      processedParents: graph[requestId].processedParents + 1,
    }
  }
}

function process(requests: Request[]): Promise<void> {
  console.log(graph);
  console.log('processing', requests.map((requests) => requests.id).join(' '));
  if (!requests) {
    return Promise.resolve();
  }

  const promises: Promise<void>[] = [];
  for (let request of requests) {
    if (request.status != Status.Idle) {
      continue;
    }
    // not all parents resolved...
    console.log('request.processedParents != request.parent_ids.length', request.processedParents, request.parent_ids.length);
    if (!request.isRoot && request.processedParents != request.parent_ids.length) {
      continue;
    }
    const promise = new Promise<void>((resolve) => {
      setGraphStatus(request.id, 1);
      setTimeout(() => {
        setGraphStatus(request.id, 2);
        resolve();
      }, request.time);
    });
    promise.then(() => {
      const children = getChildrenRequests(request);
      console.log('processing children', children)
      for (let child of children) {
        addParentRequest(child.id)
      }
      // have to take latest values :( need better solution
      return process(getChildrenRequests(request));
    })
  }
  return Promise.allSettled(promises).then(() => {});
}

function getChildrenRequests(request: Request): Request[] {
  const childrenIDs = graph[request.id]?.children_ids ?? [];
    return childrenIDs
        .map((id) => graph[id])
        .filter(Boolean);
}

let isQueuePaused = true;

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 250);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const nodes =
    Object.values(graph).map((request) => ({
      id: request.id,
      label: `${request.id} [${request.time / 1000}s, ${request.status ?? -1}]`,
      height: 50,
      width: 50,
      fill: colors[request.status],
    }));

  const edges = useMemo(() => {
    return Object.values(graph).flatMap((request) => {
      return request.children_ids.map((child_id) => ({
        id: `${request.id}->${child_id}`,
        source: request.id,
        target: child_id,
        label: `${request.id}->${child_id}`,
      }));
    });
  }, []);

  if (!isClient) {
    return <p>Not avaiable on SSR</p>;
  }

  const startProcessing = () => {
    isQueuePaused = false;
    process([graph["1"]]);
    console.log('processing...');
  };

  return (
    <main className={styles.main}>
      <div className={styles.description}>
      <button onClick={startProcessing}>Start</button>
        <div className={styles.card}>
          <GraphCanvas nodes={nodes} edges={edges}/>
        </div>
      </div>
    </main>
  );
}
