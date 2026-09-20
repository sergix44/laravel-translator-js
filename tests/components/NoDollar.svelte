<script>
    // Without the $ prefix Svelte never subscribes: this renders once via string
    // coercion and then goes stale. Pinned by a test so the behaviour is known.
    import {trans} from '../../src'

    const title = trans('Welcome!')
</script>

<h1 data-testid="title">{title}</h1>
