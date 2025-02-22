/*
 * This file is part of ORY Editor.
 *
 * ORY Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * ORY Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with ORY Editor.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @license LGPL-3.0
 * @copyright 2016-2018 Aeneas Rekkas
 * @author Aeneas Rekkas <aeneas+oss@aeneas.io>
 *
 */
import throttle from 'lodash.throttle';
import * as React from 'react';
import { connect } from '../../../reduxConnect';
import { createStructuredSelector } from 'reselect';

import { ContentPlugin } from '../../../service/plugin/classes';
import Cell from '../../Cell';
import { purifiedEditable } from '../../../selector/editable';
import dimensions from '../../Dimensions';
import { blurAllCells, createFallbackCell } from '../../../actions/cell';
import { enableGlobalBlurring, disableGlobalBlurring } from './blur';

import { EditableComponentState } from '../../../types/editable';
import { RootState } from '../../../selector';
import scollIntoViewWithOffset from '../../../components/Cell/utils/scollIntoViewWithOffset';
function isElementInViewport(el: HTMLDivElement) {
  const rect = el.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight ||
        document.documentElement.clientHeight) /*or $(window).height() */ &&
    rect.right <=
      (window.innerWidth ||
        document.documentElement.clientWidth) /*or $(window).width() */
  );
}
class Inner extends React.PureComponent<EditableComponentState> {
  ref = React.createRef<HTMLDivElement>();
  firstElementInViewport = null;

  onScroll = throttle(() => {
    if (this.ref.current) {
      const firstInViewport: HTMLDivElement = Array.prototype.find.call(
        this.ref.current.getElementsByClassName('ory-cell'),
        (cell: HTMLDivElement) => isElementInViewport(cell)
      );
      if (firstInViewport) {
        this.firstElementInViewport = {
          el: firstInViewport,
          topOffset: firstInViewport.getBoundingClientRect().top,
        };
      } else {
        this.firstElementInViewport = null;
      }
    }
  }, 600);
  componentDidMount() {
    enableGlobalBlurring(this.props.blurAllCells);
    this.createFallbackCell();
    window.addEventListener('scroll', this.onScroll);
  }

  componentDidUpdate(oldProps: EditableComponentState) {
    this.createFallbackCell();
    if (oldProps.displayMode !== this.props.displayMode) {
      if (this.firstElementInViewport) {
        let { el, topOffset } = this.firstElementInViewport;
        setTimeout(() => {
          scollIntoViewWithOffset(el, topOffset, 'auto');
        }, 0);
      }
    }
  }

  componentWillUnmount() {
    disableGlobalBlurring(this.props.blurAllCells);
    window.removeEventListener('scroll', this.onScroll);
  }
  createFallbackCell = () => {
    const { node, defaultPlugin, id } = this.props;
    if (!node) {
      return;
    }

    const { cells = [] } = node;
    if (cells.length === 0) {
      this.props.createFallbackCell(new ContentPlugin(defaultPlugin), id);
    }
  }

  render() {
    const { id, containerWidth, containerHeight, node } = this.props;
    if (!node) {
      return null;
    }

    const { cells = [] } = node;
    return (
      <div ref={this.ref} className="ory-editable ory-prevent-blur">
        {cells.map((c: string) => (
          <Cell
            rowWidth={containerWidth}
            rowHeight={containerHeight}
            editable={id}
            ancestors={[]}
            key={c}
            id={c}
          />
        ))}
      </div>
    );
  }
}

export const displayMode = ({
  reactPage: {
    display: { mode },
  },
}: RootState): string => mode;

const mapStateToProps = createStructuredSelector({
  node: purifiedEditable,
  displayMode,
});

const mapDispatchToProps = { blurAllCells, createFallbackCell };

export default dimensions()(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(Inner)
);
