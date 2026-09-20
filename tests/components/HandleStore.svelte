<script>
    // A handle is itself a Svelte store, so it works with the $ prefix directly.
    import {trans} from '../../src'

    const title = trans('Welcome!')
    const pinned = trans('Welcome!', {}, 'pt')
</script>

<h1 data-testid="title">{$title}</h1>
<p data-testid="pinned">{$pinned}</p>
