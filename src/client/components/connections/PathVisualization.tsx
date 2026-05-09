import { Link } from 'react-router-dom';
import type { ConnectionPathDto } from '@shared/dto/connections';
import styles from './EvidenceList.module.css';

interface Props {
  path: ConnectionPathDto;
}

export function PathVisualization({ path }: Props) {
  const nodes =
    path.hops > 4 ? [...path.nodes.slice(0, 2), null, ...path.nodes.slice(-2)] : path.nodes;

  return (
    <div className={styles.path}>
      {nodes.map((node, i) =>
        node == null ? (
          <span key="ellipsis" className={styles.pathEllipsis}>
            ···
          </span>
        ) : (
          <span key={node.id} className={styles.pathNode}>
            <Link to={`/entity/${node.id}`} className={styles.pathLink}>
              {node.name}
            </Link>
            {i < nodes.length - 1 && <span className={styles.pathArrow}>→</span>}
          </span>
        ),
      )}
      <span className={styles.pathMeta}>
        {path.hops} hop{path.hops !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
